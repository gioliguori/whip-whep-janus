import express from 'express';
import http from 'http';
import { JanusWhipServer } from 'janus-whip-server';
import { JanusWhepServer } from 'janus-whep-server';

const app = express();

import cors from 'cors';
app.use(cors());

// Separate Janus instances
const janusVideoroomUrl = process.env.JANUS_VIDEOROOM_WS_URL || 'ws://janus-videoroom:8188';
const janusStreamingUrl = process.env.JANUS_STREAMING_WS_URL || 'ws://janus-streaming:8188';

// WHIP server connects to videoroom instance
const whip = new JanusWhipServer({
  janus: { address: janusVideoroomUrl },
  rest: { app, basePath: '/whip' }
});

// WHEP server connects to streaming instance  
const whep = new JanusWhepServer({
  janus: { address: janusStreamingUrl },
  rest: { app, basePath: '/whep' }
});

// Debug endpoints
app.get('/endpoints', (_req, res) => {
  res.json({
    whip: whip.listEndpoints(),
    whep: whep.listEndpoints()
  });
});

// Static files for testing
app.use(express.static('web'));

// Start server
http.createServer(app).listen(7070, async () => {
  console.log('Server started on http://localhost:7070');
  console.log('Videoroom Janus:', janusVideoroomUrl);
  console.log('Streaming Janus:', janusStreamingUrl);

  // Start WHIP and WHEP servers
  await whip.start();
  await whep.start();

  // Create WHIP endpoint (connects to videoroom)
  whip.createEndpoint({
    id: 'abc123',
    room: 1234,
    token: 'verysecret',
    secret: 'adminpwd',
    // RTP forwarding to streaming instance
    recipient: {
      host: 'janus-streaming',  // Docker service name
      audioPort: 5002,
      videoPort: 5004,
      videoRtcpPort: 5005
    }
  });

  // Create WHEP endpoint (connects to streaming)
  whep.createEndpoint({
    id: 'abc123',
    mountpoint: 1,
    token: 'verysecret'
  });

  console.log('WHIP/WHEP endpoints created successfully');
});