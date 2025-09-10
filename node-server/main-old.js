import express from 'express';
import http from 'http';
import { JanusWhipServer } from 'janus-whip-server';
import { JanusWhepServer } from 'janus-whep-server';

const app = express();

import cors from 'cors';
app.use(cors());
app.use(express.json());

// Separate Janus instances
const janusVideoroomUrl = process.env.JANUS_VIDEOROOM_WS_URL || 'ws://janus-videoroom:8188';
const janusStreamingUrl = process.env.JANUS_STREAMING_WS_URL || 'ws://janus-streaming:8188';

// HTTP URLs per API REST (converti WebSocket in HTTP)
const janusVideoroomHttpUrl = janusVideoroomUrl.replace('ws://', 'http://').replace(':8188', ':8088');
const janusStreamingHttpUrl = janusStreamingUrl.replace('ws://', 'http://').replace(':8188', ':8088');

console.log('Janus VideoRoom HTTP URL:', janusVideoroomHttpUrl);
console.log('Janus Streaming HTTP URL:', janusStreamingHttpUrl);

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

// Classe per gestire le API Janus HTTP
class JanusHttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.sessionId = null;
    this.handleId = null;
  }

  async createSession() {
    const response = await fetch(`${this.baseUrl}/janus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        janus: 'create',
        transaction: this.generateTransactionId()
      })
    });
    
    const data = await response.json();
    if (data.janus === 'success') {
      this.sessionId = data.data.id;
      console.log('Sessione Janus creata:', this.sessionId);
      return this.sessionId;
    }
    throw new Error('Errore creazione sessione: ' + JSON.stringify(data));
  }

  async attachPlugin(plugin) {
    if (!this.sessionId) await this.createSession();
    
    const response = await fetch(`${this.baseUrl}/janus/${this.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        janus: 'attach',
        plugin: plugin,
        transaction: this.generateTransactionId()
      })
    });
    
    const data = await response.json();
    if (data.janus === 'success') {
      this.handleId = data.data.id;
      console.log('Handle plugin creato:', this.handleId);
      return this.handleId;
    }
    throw new Error('Errore attach plugin: ' + JSON.stringify(data));
  }

  async sendMessage(body) {
    if (!this.sessionId || !this.handleId) {
      throw new Error('Sessione o handle non inizializzati');
    }

    const response = await fetch(`${this.baseUrl}/janus/${this.sessionId}/${this.handleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        janus: 'message',
        body: body,
        transaction: this.generateTransactionId()
      })
    });
    
    const data = await response.json();
    return data;
  }

  generateTransactionId() {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Client per VideoRoom
const videoroomClient = new JanusHttpClient(janusVideoroomHttpUrl);

// Inizializza connessione al VideoRoom
async function initVideoRoom() {
  try {
    console.log('Inizializzando VideoRoom client...');
    await videoroomClient.createSession();
    await videoroomClient.attachPlugin('janus.plugin.videoroom');
    console.log('VideoRoom client pronto!');
    return true;
  } catch (error) {
    console.error('Errore inizializzazione VideoRoom:', error.message);
    return false;
  }
}

// API REST per gestire le stanze VideoRoom
app.post('/api/rooms', async (req, res) => {
  try {
    console.log('Creando stanza con dati:', req.body);
    
    const roomData = {
      request: 'create',
      ...req.body
    };
    
    const response = await videoroomClient.sendMessage(roomData);
    console.log('Risposta creazione stanza:', response);
    
    if (response.janus === 'success') {
      res.json(response.plugindata.data);
    } else {
      res.status(500).json({ error: 'Errore creazione stanza', details: response });
    }
  } catch (error) {
    console.error('Errore API creazione stanza:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    console.log('Richiedendo lista stanze...');
    
    const response = await videoroomClient.sendMessage({ request: 'list' });
    console.log('Risposta lista stanze:', response);
    
    if (response.janus === 'success') {
      res.json(response.plugindata.data);
    } else {
      res.status(500).json({ error: 'Errore lista stanze', details: response });
    }
  } catch (error) {
    console.error('Errore API lista stanze:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rooms/:roomId', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    console.log('Eliminando stanza:', roomId);
    
    const response = await videoroomClient.sendMessage({
      request: 'destroy',
      room: roomId,
      secret: 'adminpwd'
    });
    
    console.log('Risposta eliminazione stanza:', response);
    
    if (response.janus === 'success') {
      res.json(response.plugindata.data);
    } else {
      res.status(500).json({ error: 'Errore eliminazione stanza', details: response });
    }
  } catch (error) {
    console.error('Errore API eliminazione stanza:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId/exists', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    console.log('Verificando esistenza stanza:', roomId);
    
    const response = await videoroomClient.sendMessage({
      request: 'exists',
      room: roomId
    });
    
    if (response.janus === 'success') {
      res.json(response.plugindata.data);
    } else {
      res.status(500).json({ error: 'Errore verifica stanza', details: response });
    }
  } catch (error) {
    console.error('Errore API verifica stanza:', error.message);
    res.status(500).json({ error: error.message });
  }
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

  // Inizializza VideoRoom (senza bloccare l'avvio)
  const videoroomReady = await initVideoRoom();
  if (videoroomReady) {
    console.log('VideoRoom API pronte!');
  } else {
    console.log('VideoRoom API non disponibili');
  }

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
  console.log('Test API: curl http://localhost:7070/api/rooms');
});