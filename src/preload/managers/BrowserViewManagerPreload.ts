import { ipcRenderer } from "electron";

/**
 * Manager to help create and manager browser views
 * This class is to be run on the renderer thread
 * For the main thread counterpart see `BrowserViewManagerMain.ts`
 */
export class BrowserViewManagerPreload {
  /** Audio context to mix media streams into one audio output */
  _audioContext: AudioContext;
  /** Audio output node that streams will connect to */
  _audioOutputNode: AudioNode;

  /** Audio DOM element for the current output / local playback */
  _audioOutputElement: HTMLAudioElement;
  /** Raw media streams for each browser view containing webp/opus audio */
  _mediaStreams: Record<number, MediaStream>;

  constructor() {
    this._mediaStreams = {};

    this._audioContext = new AudioContext({ latencyHint: "playback" });
    this._audioOutputNode = this._audioContext.createGain();
  }

  load() {
    this._setupPlayback();
    ipcRenderer.send("BROWSER_VIEW_STREAM_START");
  }

  destroy() {
    for (let stream of Object.values(this._mediaStreams)) {
      for (let track of stream.getTracks()) {
        track.stop();
      }
    }
    ipcRenderer.send("BROWSER_VIEW_REMOVE_ALL_BROWSER_VIEWS");
    ipcRenderer.send("BROWSER_VIEW_STREAM_END");
  }

  async createBrowserView(
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    preload?: string
  ): Promise<number> {
    const viewId = ipcRenderer.sendSync(
      "BROWSER_VIEW_CREATE_BROWSER_VIEW",
      url,
      x,
      y,
      width,
      height,
      preload
    );
    this._startStream(viewId);
    return viewId;
  }

  removeBrowserView(id: number) {
    ipcRenderer.send("BROWSER_VIEW_REMOVE_BROWSER_VIEW", id);
    if (this._mediaStreams[id]) {
      for (let track of this._mediaStreams[id].getTracks()) {
        track.stop();
      }
      delete this._mediaStreams[id];
    }
  }

  hideBrowserView(id: number) {
    ipcRenderer.send("BROWSER_VIEW_HIDE_BROWSER_VIEW", id);
  }

  showBrowserView(id: number) {
    ipcRenderer.send("BROWSER_VIEW_SHOW_BROWSER_VIEW", id);
  }

  setBrowserViewBounds(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    ipcRenderer.send(
      "BROWSER_VIEW_SET_BROWSER_VIEW_BOUNDS",
      id,
      x,
      y,
      width,
      height
    );
  }

  loadURL(id: number, url: string) {
    ipcRenderer.send("BROWSER_VIEW_LOAD_URL", id, url);
  }

  goForward(id: number) {
    ipcRenderer.send("BROWSER_VIEW_GO_FORWARD", id);
  }

  goBack(id: number) {
    ipcRenderer.send("BROWSER_VIEW_GO_BACK", id);
  }

  reload(id: number) {
    ipcRenderer.send("BROWSER_VIEW_RELOAD", id);
  }

  /**
   * Toggle the playback of the view audio in the current window
   * @param {boolean} loopback
   */
  setLoopback(loopback: boolean) {
    this._audioOutputElement.muted = !loopback;
  }

  _setupPlayback() {
    const destination = this._audioContext.createMediaStreamDestination();

    this._audioOutputElement = document.createElement("audio");
    this._audioOutputElement.srcObject = destination.stream;
    this._audioOutputElement.onloadedmetadata = (e) => {
      this._audioOutputElement.play();
    };

    const recorder = new MediaRecorder(destination.stream);
    recorder.ondataavailable = (event) => {
      event.data.arrayBuffer().then((buffer) => {
        ipcRenderer.send("BROWSER_VIEW_STREAM_DATA", buffer);
      });
    };
    recorder.start(60);

    this._audioOutputNode.connect(destination);
  }

  async _startStream(viewId: number) {
    try {
      const mediaSourceId = await ipcRenderer.invoke(
        "BROWSER_VIEW_GET_MEDIA_SOURCE_ID",
        viewId
      );
      const streamConfig = {
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: mediaSourceId,
          },
        },
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(
        streamConfig as any
      );
      this._mediaStreams[viewId] = stream;

      const audioSource = this._audioContext.createMediaStreamSource(stream);
      audioSource.connect(this._audioOutputNode);
    } catch (error) {
      console.error(`Unable to start stream for web view ${viewId}`);
      console.error(error);
    }
  }
}
