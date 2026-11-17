/**
 * WebSocket Remote Control Client (TV Receiver)
 * Listens for remote events from HDMI-CEC and Smartphone Remotes.
 */

class TVRemoteClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8080';
    const wsUrl = `${protocol}//${host}/ws/remote?client_type=tv`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('[RemoteClient] Connected to TV Remote WebSocket hub');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleRemoteMessage(msg);
        } catch (e) {
          console.error('[RemoteClient] Invalid message JSON:', event.data);
        }
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[RemoteClient] WebSocket error:', err);
        this.ws.close();
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(10000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
    setTimeout(() => this.connect(), delay);
  }

  handleRemoteMessage(msg) {
    if (!msg || !msg.action) return;

    if (window.SpatialNav) {
      window.SpatialNav.resetScreensaverTimer();
      if (window.SpatialNav.isScreensaverActive) {
        window.SpatialNav.dismissScreensaver();
        return;
      }
    }

    const action = msg.action.toUpperCase();

    switch (action) {
      case 'UP':
        window.SpatialNav?.navigateDirection('up');
        break;
      case 'DOWN':
        window.SpatialNav?.navigateDirection('down');
        break;
      case 'LEFT':
        window.SpatialNav?.navigateDirection('left');
        break;
      case 'RIGHT':
        window.SpatialNav?.navigateDirection('right');
        break;
      case 'SELECT':
      case 'ENTER':
      case 'OK':
        window.SpatialNav?.activateCurrent();
        break;
      case 'BACK':
      case 'EXIT':
        window.SpatialNav?.navigateBack();
        break;
      case 'HOME':
        window.TVRouter?.navigate('home');
        break;
      case 'SEARCH':
        window.TVRouter?.navigate('search');
        break;
      case 'SETTINGS':
        window.TVRouter?.navigate('settings');
        break;
      case 'TEXT':
        if (msg.text) {
          if (window.TVRouter?.currentScreen !== 'search') {
            window.TVRouter?.navigate('search');
          }
          window.TVSearch?.setQuery(msg.text);
        }
        break;
      case 'KEY_PRESS':
        if (msg.char) {
          window.TVSearch?.appendCharacter(msg.char);
        }
        break;
      case 'PLAY_PAUSE':
        // Trigger play/pause in active media modal or current media
        const activeVideo = document.querySelector('video');
        if (activeVideo) {
          if (activeVideo.paused) activeVideo.play();
          else activeVideo.pause();
        } else {
          window.SpatialNav?.activateCurrent();
        }
        break;
      default:
        console.log('[RemoteClient] Unhandled action:', action);
        break;
    }
  }
}

window.TVRemote = new TVRemoteClient();
