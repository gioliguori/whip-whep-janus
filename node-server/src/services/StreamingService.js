import { JanusHttpClient } from './JanusHttpClient.js';

export class StreamingService {
  constructor(janusHttpUrl) {
    this.client = new JanusHttpClient(janusHttpUrl);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return true;
    
    try {
      await this.client.createSession();
      await this.client.attachPlugin('janus.plugin.streaming');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Streaming service init error:', error.message);
      return false;
    }
  }

  async createRtpMountpoint(mountpointData) {
    await this.ensureInitialized();
    
    const requestData = {
      request: 'create',
      type: 'rtp',
      id: mountpointData.id || Math.floor(Math.random() * 10000),
      description: mountpointData.description || 'RTP Stream',
      media: []
    };

    if (mountpointData.metadata) requestData.metadata = mountpointData.metadata;
    if (mountpointData.secret) requestData.secret = mountpointData.secret;
    if (mountpointData.is_private !== undefined) requestData.is_private = mountpointData.is_private;

    // Audio stream
    if (mountpointData.audio !== false) {
      requestData.media.push({
        type: 'audio',
        mid: mountpointData.audio_mid || 'a',
        port: mountpointData.audioport || 5002,
        pt: mountpointData.audiopt || 111,
        codec: mountpointData.audiocodec || 'opus'
      });
    }

    // Video stream
    if (mountpointData.video !== false) {
      requestData.media.push({
        type: 'video',
        mid: mountpointData.video_mid || 'v',
        port: mountpointData.videoport || 5004,
        pt: mountpointData.videopt || 100,
        codec: mountpointData.videocodec || 'vp8'
      });
    }
    
    const response = await this.client.sendMessage(requestData);
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Mountpoint creation failed: ' + JSON.stringify(response));
    }
  }
 /*
  // metodo legacy
  async createLegacyRtpMountpoint(mountpointData) {
    await this.ensureInitialized();
    
    const requestData = {
      request: 'create',
      type: 'rtp',
      id: mountpointData.id || Math.floor(Math.random() * 10000),
      description: mountpointData.description || 'RTP Stream',
      audio: mountpointData.audio !== false,
      video: mountpointData.video !== false,
      audioport: mountpointData.audioport || 5002,
      audiopt: mountpointData.audiopt || 111,
      audiocodec: mountpointData.audiocodec || 'opus',
      videoport: mountpointData.videoport || 5004,
      videopt: mountpointData.videopt || 100,
      videocodec: mountpointData.videocodec || 'vp8',
      secret: mountpointData.secret || 'adminpwd'
    };

    if (mountpointData.videortcpport) requestData.videortcpport = mountpointData.videortcpport;
    
    const response = await this.client.sendMessage(requestData);
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Legacy mountpoint creation failed: ' + JSON.stringify(response));
    }
  }
  */
 
  async listMountpoints() {
    await this.ensureInitialized();
    
    const response = await this.client.sendMessage({ request: 'list' });
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Mountpoints list failed');
    }
  }

  async destroyMountpoint(mountpointId, secret = 'adminpwd') {
    await this.ensureInitialized();
    
    const response = await this.client.sendMessage({
      request: 'destroy',
      id: parseInt(mountpointId),
      secret: secret
    });
    
    if (response.janus === 'success') {
      return response.plugindata.data;
    } else {
      throw new Error('Mountpoint destruction failed');
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      const success = await this.init();
      if (!success) {
        throw new Error('Streaming service not initialized');
      }
    }
  }
}