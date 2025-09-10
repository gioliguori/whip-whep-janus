import { JanusHttpClient } from './JanusHttpClient.js';

export class VideoRoomService {
  constructor(janusHttpUrl) {
    this.client = new JanusHttpClient(janusHttpUrl);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return true;
    
    try {
      await this.client.createSession();
      await this.client.attachPlugin('janus.plugin.videoroom');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('VideoRoom service init error:', error.message);
      return false;
    }
  }

  async createRoom(roomData) {
    await this.ensureInitialized();
    
    const requestData = {
      request: 'create',
      room: roomData.room || Math.floor(Math.random() * 10000),
      description: roomData.description || 'Video Room',
      secret: roomData.secret || 'adminpwd',
      publishers: roomData.publishers || 6,
      bitrate: roomData.bitrate || 128000,
      fir_freq: roomData.fir_freq || 10,
      audiocodec: roomData.audiocodec || 'opus',
      videocodec: roomData.videocodec || 'vp8',
      record: roomData.record || false,
      ...roomData
    };
    
    const response = await this.client.sendMessage(requestData);
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Room creation failed: ' + JSON.stringify(response));
    }
  }

  async listRooms() {
    await this.ensureInitialized();
    
    const response = await this.client.sendMessage({ request: 'list' });
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Room list failed');
    }
  }

  async destroyRoom(roomId, secret = 'adminpwd') {
    await this.ensureInitialized();
    
    const response = await this.client.sendMessage({
      request: 'destroy',
      room: parseInt(roomId),
      secret: secret
    });
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Room destruction failed');
    }
  }

  async roomExists(roomId) {
    await this.ensureInitialized();
    
    const response = await this.client.sendMessage({
      request: 'exists',
      room: parseInt(roomId)
    });
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Room exists check failed');
    }
  }

  async listParticipants(roomId) {
    await this.ensureInitialized();
    
    const response = await this.client.sendMessage({
      request: 'listparticipants',
      room: parseInt(roomId)
    });
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Participants list failed');
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      const success = await this.init();
      if (!success) {
        throw new Error('VideoRoom service not initialized');
      }
    }
  }
}