const { contextBridge, ipcRenderer, desktopCapturer } = require('electron');
const { LogoScrape } = require('logo-scrape');

/**
 * Manager to help create and manager browser views
 * This class is to be run on the renderer thread
 * For the main thread counterpart see `BrowserViewManagerMain.ts`
 */
class BrowserViewManagerRenderer {
  /**
   * Audio context to mix media streams into one audio output
   * @type AudioContext
   */
  _audioContext;
  /**
   * Audio output node that streams will connect to
   * @type AudioNode
   */
  _audioOutputNode;

  /**
   * Audio DOM element for the current output
   * @type HTMLAudioElement
   */
  _audioOutputElement;
  /**
   * Raw media streams for each browser view containing ogg/opus audio
   * @type Record<number, MediaStream>
   */
  _mediaStreams;

  constructor() {
    this._mediaStreams = {};

    this._audioContext = new AudioContext();
    this._audioOutputNode = this._audioContext.createGain();
    const destination = this._audioContext.createMediaStreamDestination();
    this._audioOutputNode.connect(destination);

    const recorder = new MediaRecorder(destination.stream);
    recorder.ondataavailable = (event) => {
      event.data.arrayBuffer().then((buffer) => {
        ipcRenderer.send('browserViewStream', buffer);
      });
    };
    recorder.start(500);

    this._audioOutputElement = document.createElement('audio');
    this._audioOutputElement.srcObject = destination.stream;
    this._audioOutputElement.onloadedmetadata = (e) =>
      this._audioOutputElement.play();
  }

  createBrowserView(url, x, y, width, height) {
    const viewId = ipcRenderer.sendSync(
      'createBrowserView',
      url,
      x,
      y,
      width,
      height
    );
    this._startStream(viewId);
    return viewId;
  }

  removeBrowserView(id) {
    ipcRenderer.send('removeBrowserView', id);
    if (this._mediaStreams[id]) {
      delete this._mediaStreams[id];
    }
  }

  loadURL(id, url) {
    ipcRenderer.send('loadURL', id, url);
  }

  goForward(id) {
    ipcRenderer.send('goForward', id);
  }

  goBack(id) {
    ipcRenderer.send('goBack', id);
  }

  reload(id) {
    ipcRenderer.send('reload', id);
  }

  /**
   * Toggle the playback of the view audio in the current window
   * @param {boolean} loopback
   */
  setLoopback(loopback) {
    this._audioOutputElement.muted = !loopback;
  }

  _startStream(viewId) {
    desktopCapturer
      .getMediaSourceIdForWebContents(viewId)
      .then((mediaSourceId) => {
        const streamConfig = {
          audio: {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: mediaSourceId,
            },
          },
          video: false,
        };
        navigator.mediaDevices.getUserMedia(streamConfig).then((stream) => {
          this._mediaStreams[viewId] = stream;

          const audioSource =
            this._audioContext.createMediaStreamSource(stream);
          audioSource.connect(this._audioOutputNode);
        });
      })
      .catch((err) => {
        console.error(`Unable to start stream for web view ${viewId}`);
      });
  }
}

const viewManager = new BrowserViewManagerRenderer();

const validChannels = [
  'error',
  'message',
  'info',
  'ready',
  'disconnect',
  'voiceChannels',
  'channelJoined',
  'channelLeft',
];

const api = {
  connect: (token) => {
    ipcRenderer.send('connect', token);
  },
  disconnect: (token) => {
    ipcRenderer.send('disconnect');
  },
  joinChannel: (channelId) => {
    ipcRenderer.send('joinChannel', channelId);
    viewManager.setLoopback(channelId === 'loocal');
  },
  createBrowserView: (url, x, y, width, height) => {
    return viewManager.createBrowserView(url, x, y, width, height);
  },
  removeBrowserView: (id) => {
    viewManager.removeBrowserView(id);
  },
  loadURL: (id, url) => {
    viewManager.loadURL(id, url);
  },
  goForward: (id) => {
    viewManager.goForward(id);
  },
  goBack: (id) => {
    viewManager.goBack(id);
  },
  reload: (id) => {
    viewManager.reload(id);
  },
  on: (channel, callback) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_, ...args) => callback(args);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeAllListeners: (channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  appIcon: (url) => {
    return LogoScrape.getLogos(url)
      .then((icons) => {
        // Find icon with the largest size
        const sorted = icons.sort((a, b) => {
          const aSize = parseInt((a.size || '0x0').split('x')[0] || 0);
          const bSize = parseInt((b.size || '0x0').split('x')[0] || 0);
          return bSize - aSize;
        });
        const urls = sorted.map((icon) => icon.url);
        return urls[0] || '';
      })
      .catch((err) => {
        console.error(err);
        return '';
      });
  },
};

contextBridge.exposeInMainWorld('kenku', api);
