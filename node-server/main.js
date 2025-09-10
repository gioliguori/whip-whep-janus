import express from 'express';
import http from 'http';
import cors from 'cors';
import { JanusWhipServer } from 'janus-whip-server';
import { JanusWhepServer } from 'janus-whep-server';

import { VideoRoomService } from './src/services/VideoRoomService.js';
import { StreamingService } from './src/services/StreamingService.js';
import { createVideoRoomRoutes } from './src/routes/videoroom.js';
import { createStreamingRoutes } from './src/routes/streaming.js';

const app = express();
app.use(cors());
app.use(express.json());

const janusVideoroomUrl = process.env.JANUS_VIDEOROOM_WS_URL || 'ws://janus-videoroom:8188';
const janusStreamingUrl = process.env.JANUS_STREAMING_WS_URL || 'ws://janus-streaming:8188';

const janusVideoroomHttpUrl = janusVideoroomUrl.replace('ws://', 'http://').replace(':8188', ':8088');
const janusStreamingHttpUrl = janusStreamingUrl.replace('ws://', 'http://').replace(':8188', ':8088');

// inizializzazione servizi
const videoRoomService = new VideoRoomService(janusVideoroomHttpUrl);
const streamingService = new StreamingService(janusStreamingHttpUrl);

// WHIP/WHEP servers
const whip = new JanusWhipServer({
  janus: { address: janusVideoroomUrl },
  rest: { app, basePath: '/whip' }
});

const whep = new JanusWhepServer({
  janus: { address: janusStreamingUrl },
  rest: { app, basePath: '/whep' }
});

// API Routes
app.use('/api/videoroom', createVideoRoomRoutes(videoRoomService));
app.use('/api/streaming', createStreamingRoutes(streamingService));

// sessione completa
app.post('/api/sessions', async (req, res) => {
  try {
    const { sessionId, roomConfig = {}, streamConfig = {} } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // 1. Create VideoRoom
    const roomData = {
      room: parseInt(sessionId),
      description: `Session ${sessionId}`,
      secret: 'adminpwd',
      publishers: 6,
      bitrate: 256000,
      fir_freq: 10,
      ...roomConfig
    };
    
    const room = await videoRoomService.createRoom(roomData);
    
    // 2. Create Streaming Mountpoint
    const basePortOffset = (parseInt(sessionId) % 100) * 10;
    const mountpointData = {
      id: parseInt(sessionId),
      description: `Stream for session ${sessionId}`,
      audioport: 5002 + basePortOffset,
      videoport: 5004 + basePortOffset,
      secret: 'adminpwd',
      ...streamConfig
    };
    
    const mountpoint = await streamingService.createRtpMountpoint(mountpointData);
    
    // 3. Create WHIP endpoint
    whip.createEndpoint({
      id: String(sessionId),
      room: roomData.room,
      token: 'verysecret',
      secret: 'adminpwd',
      recipient: {
        host: 'janus-streaming',
        audioPort: mountpointData.audioport,
        videoPort: mountpointData.videoport
      }
    });
    
    // 4. Create WHEP endpoint
    whep.createEndpoint({
      id: String(sessionId),
      mountpoint: mountpointData.id,
      token: 'verysecret'
    });
    
    res.json({
      sessionId,
      room,
      mountpoint,
      endpoints: {
        whip: `/whip/endpoint/${sessionId}`,
        whep: `/whep/endpoint/${sessionId}`
      }
    });
    
  } catch (error) {
    console.error('Session creation error:', error.message);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// Status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const [rooms, mountpoints] = await Promise.all([
      videoRoomService.listRooms().catch(e => ({ error: e.message })),
      streamingService.listMountpoints().catch(e => ({ error: e.message }))
    ]);
    
    res.json({
      videoRoom: { status: rooms.error ? 'error' : 'ok', data: rooms },
      streaming: { status: mountpoints.error ? 'error' : 'ok', data: mountpoints },
      endpoints: {
        whip: whip.listEndpoints(),
        whep: whep.listEndpoints()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Static files
app.use(express.static('web'));

// Start server
http.createServer(app).listen(7070, async () => {
  console.log('🚀 Server started on http://localhost:7070');
  
  // Start WHIP and WHEP servers
  await whip.start();
  await whep.start();
  
  // Initialize services
  const [videoroomReady, streamingReady] = await Promise.all([
    videoRoomService.init(),
    streamingService.init()
  ]);
  
  console.log('✅ VideoRoom API:', videoroomReady ? 'ready' : 'error');
  console.log('✅ Streaming API:', streamingReady ? 'ready' : 'error');
  console.log('📚 Main endpoint: POST /api/sessions');
});

process.on('SIGTERM', () => process.exit(0));