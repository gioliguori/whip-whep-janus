import express from 'express';
import http from 'http';
import { JanusWhipServer } from 'janus-whip-server';
import { JanusWhepServer } from 'janus-whep-server';

const app = express();

import cors from 'cors';
app.use(cors());

const janusUrl = process.env.JANUS_WS_URL || 'ws://localhost:8188';

const whip = new JanusWhipServer({
  janus: { address: janusUrl },
  rest: { app, basePath: '/whip' }
});

const whep = new JanusWhepServer({
  janus: { address: janusUrl },
  rest: { app, basePath: '/whep' }
});

// Endpoint informativo per vedere le risorse attive
app.get('/endpoints', (_req, res) => {
  res.json({
    whip: whip.listEndpoints(),
    whep: whep.listEndpoints()
  });
});

// Serve file statici (opzionale)
app.use(express.static('web'));

// Avvio server HTTP
http.createServer(app).listen(7070, async () => {
  console.log('Server avviato su http://localhost:7070');

  // Avvio WHIP e WHEP
  await whip.start();
  await whep.start();

  // Crea endpoint WHIP (ingestion)
  whip.createEndpoint({
    id: 'abc123',
    room: 1234,
    token: 'verysecret',
    secret: 'adminpwd',
    recipient: {
      host: '127.0.0.1',
      audioPort: 5002,
      videoPort: 5004,
      videoRtcpPort: 5005
    }
  });

  // Crea endpoint WHEP (egress)
  whep.createEndpoint({
    id: 'abc123',
    mountpoint: 1,
    token: 'verysecret'
  });
});
