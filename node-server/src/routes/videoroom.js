import express from 'express';

export function createVideoRoomRoutes(videoRoomService) {
  const router = express.Router();

  // Create room
  router.post('/rooms', async (req, res) => {
    try {
      const result = await videoRoomService.createRoom(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // List rooms
  router.get('/rooms', async (req, res) => {
    try {
      const result = await videoRoomService.listRooms();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete room
  router.delete('/rooms/:roomId', async (req, res) => {
    try {
      const roomId = req.params.roomId;
      const secret = req.body.secret || 'adminpwd';
      const result = await videoRoomService.destroyRoom(roomId, secret);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if room exists
  router.get('/rooms/:roomId/exists', async (req, res) => {
    try {
      const roomId = req.params.roomId;
      const result = await videoRoomService.roomExists(roomId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // List participants
  router.get('/rooms/:roomId/participants', async (req, res) => {
    try {
      const roomId = req.params.roomId;
      const result = await videoRoomService.listParticipants(roomId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}