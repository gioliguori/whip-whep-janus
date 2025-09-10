import express from 'express';

export function createStreamingRoutes(streamingService) {
  const router = express.Router();

  // Create mountpoint
  router.post('/mountpoints', async (req, res) => {
    try {
      const result = await streamingService.createRtpMountpoint(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // List mountpoints
  router.get('/mountpoints', async (req, res) => {
    try {
      const result = await streamingService.listMountpoints();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete mountpoint
  router.delete('/mountpoints/:mountpointId', async (req, res) => {
    try {
      const mountpointId = req.params.mountpointId;
      const secret = req.body.secret || 'adminpwd';
      const result = await streamingService.destroyMountpoint(mountpointId, secret);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}