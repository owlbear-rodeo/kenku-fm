import { ipcRenderer, desktopCapturer } from "electron";

import audioStreamProcessorUrl from "worklet-loader!../worklets/AudioStreamProcessor.worklet.js";

/**
 * Manager to help create and manager browser views
 * This class is to be run on the renderer thread
 * For the main thread counterpart see `BrowserViewManagerMain.ts`
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
   * Audio DOM element for the current output / local playback
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
  }

  async load() {
    this._createLocalProcessor();
    await this._createStreamProcessor();
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

  _createLocalProcessor() {
    const localOutput = this._audioContext.createMediaStreamDestination();

    this._audioOutputElement = document.createElement("audio");
    this._audioOutputElement.srcObject = localOutput.stream;
    this._audioOutputElement.onloadedmetadata = (e) => {
      this._audioOutputElement.play();
    };

    this._audioOutputNode.connect(localOutput);
  }

  async _createStreamProcessor() {
    await this._audioContext.audioWorklet.addModule(audioStreamProcessorUrl);
    const streamProcessor = new AudioWorkletNode(
      this._audioContext,
      "audio-stream-processor"
    );

    streamProcessor.port.onmessage = (e) => {
      if (e.data.eventType === "data") {
        ipcRenderer.send("browserViewStream", e.data.data);
      }
    };

    this._audioOutputNode.connect(streamProcessor);
  }

  async _startStream(viewId: number) {
    try {
      const mediaSourceId =
        await desktopCapturer.getMediaSourceIdForWebContents(viewId);
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
    } catch {
      console.error(`Unable to start stream for web view ${viewId}`);
    }
  }
}
