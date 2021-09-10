import { ipcRenderer, desktopCapturer } from "electron";

/**
 * Manager to help create and manager browser views
 * This class is to be run on the renderer thread
 * For the main thread counterpart see `main/BrowserViewManagerMain.ts`
 */
export class BrowserViewManagerPreload {
  /**
   * Audio context to mix media streams into one audio output
   */
  _audioContext: AudioContext;
  /**
   * Audio output node that streams will connect to
   */
  _audioOutputNode: AudioNode;

  /**
   * Audio DOM element for the current output
   */
  _audioOutputElement: HTMLAudioElement;
  /**
   * Raw media streams for each browser view containing ogg/opus audio
   */
  _mediaStreams: Record<number, MediaStream>;

  constructor() {
    this._mediaStreams = {};

    this._audioContext = new AudioContext();
    this._audioOutputNode = this._audioContext.createGain();
    const destination = this._audioContext.createMediaStreamDestination();
    this._audioOutputNode.connect(destination);

    const recorder = new MediaRecorder(destination.stream);
    recorder.ondataavailable = (event) => {
      event.data.arrayBuffer().then((buffer) => {
        ipcRenderer.send("browserViewStream", buffer);
      });
    };
    recorder.start(50);

    this._audioOutputElement = document.createElement("audio");
    this._audioOutputElement.srcObject = destination.stream;
    this._audioOutputElement.onloadedmetadata = (e) =>
      this._audioOutputElement.play();
  }

  createBrowserView(
    url: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const viewId = ipcRenderer.sendSync(
      "createBrowserView",
      url,
      x,
      y,
      width,
      height
    );
    this._startStream(viewId);
    return viewId;
  }

  removeBrowserView(id: number) {
    ipcRenderer.send("removeBrowserView", id);
    if (this._mediaStreams[id]) {
      delete this._mediaStreams[id];
    }
  }

  loadURL(id: number, url: string) {
    ipcRenderer.send("loadURL", id, url);
  }

  goForward(id: number) {
    ipcRenderer.send("goForward", id);
  }

  goBack(id: number) {
    ipcRenderer.send("goBack", id);
  }

  reload(id: number) {
    ipcRenderer.send("reload", id);
  }

  /**
   * Toggle the playback of the view audio in the current window
   * @param {boolean} loopback
   */
  setLoopback(loopback: boolean) {
    this._audioOutputElement.muted = !loopback;
  }

  _startStream(viewId: number) {
    desktopCapturer
      .getMediaSourceIdForWebContents(viewId)
      .then((mediaSourceId) => {
        const streamConfig = {
          audio: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: mediaSourceId,
            },
          },
          video: false,
        };
        navigator.mediaDevices
          .getUserMedia(streamConfig as any)
          .then((stream) => {
            this._mediaStreams[viewId] = stream;

            const audioSource =
              this._audioContext.createMediaStreamSource(stream);
            audioSource.connect(this._audioOutputNode);
          });
      })
      .catch(() => {
        console.error(`Unable to start stream for web view ${viewId}`);
      });
  }
}
