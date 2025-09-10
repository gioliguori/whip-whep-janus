export class JanusHttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.sessionId = null;
    this.handleId = null;
    this.keepAliveInterval = null;
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
      console.log('Janus session created:', this.sessionId);
      
      // Keep-alive altrimenti non riesco a creare mountpoint e room
      this.startKeepAlive();
      
      return this.sessionId;
    }
    throw new Error('Session creation error: ' + JSON.stringify(data));
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
      console.log('Plugin handle created:', this.handleId, 'for plugin:', plugin);
      return this.handleId;
    }
    
    // per sessione expired
    if (data.janus === 'error' && data.error && data.error.code === 458) {
      console.log('Session expired, recreating...');
      this.sessionId = null;
      this.handleId = null;
      this.stopKeepAlive();
      
      // Retry
      await this.createSession();
      return await this.attachPlugin(plugin);
    }
    
    throw new Error('Plugin attach error: ' + JSON.stringify(data));
  }

  async sendMessage(body) {
    if (!this.sessionId || !this.handleId) {
      throw new Error('Session or handle not initialized');
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
    
    // per sessione expired
    if (data.janus === 'error' && data.error && data.error.code === 458) {
      console.log('Session expired during message, recreating...');
      this.sessionId = null;
      this.handleId = null;
      this.stopKeepAlive();
      throw new Error('Session expired, please retry');
    }
    
    return data;
  }

  startKeepAlive() {
    // 30 sec
    this.keepAliveInterval = setInterval(async () => {
      if (this.sessionId) {
        try {
          await fetch(`${this.baseUrl}/janus/${this.sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              janus: 'keepalive',
              transaction: this.generateTransactionId()
            })
          });
          console.log('Keep-alive sent for session:', this.sessionId);
        } catch (error) {
          console.error('Keep-alive failed:', error.message);
        }
      }
    }, 30000);
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  generateTransactionId() {
    return Math.random().toString(36).substring(2, 15);
  }

  async destroy() {
    try {
      this.stopKeepAlive();
      
      if (this.sessionId) {
        await fetch(`${this.baseUrl}/janus/${this.sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            janus: 'destroy',
            transaction: this.generateTransactionId()
          })
        });
        console.log('Session destroyed:', this.sessionId);
      }
    } catch (error) {
      console.error('Error destroying session:', error);
    } finally {
      this.sessionId = null;
      this.handleId = null;
    }
  }
}