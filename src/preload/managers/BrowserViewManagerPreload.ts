import { ipcRenderer } from "electron";
// @ts-ignore
import PCMStream from "./PCMStream.worklet";
// @ts-ignore
import Worker from "./StreamSender.worker";

const streamSender = new Worker();

/** Sample rate of the audio context */
const SAMPLE_RATE = 48000;
/** Number of channels for the audio context */
const NUM_CHANNELS = 2;
/** 16 bit audio data */
const BIT_DEPTH = 16;
/** Number of bytes per audio sample */
const BYTES_PER_SAMPLE = BIT_DEPTH / 8;
/** 20ms Opus frame duration */
const FRAME_DURATION = 20;
/** Duration of each audio frame in seconds */
const FRAME_DURATION_SECONDS = FRAME_DURATION / 1000;
/**
 * Size in bytes of each frame of audio
 * We stream audio to the main context as 16bit PCM data
 * At 48KHz with a frame duration of 20ms (or 0.02s) and a stereo signal
 * our `frameSize` is calculated by:
 * `SAMPLE_RATE * FRAME_DURATION_SECONDS * NUM_CHANNELS / BYTES_PER_SAMPLE`
 * or:
 * `48000 * 0.02 * 2 / 2 = 960`
 */
const FRAME_SIZE =
  (SAMPLE_RATE * FRAME_DURATION_SECONDS * NUM_CHANNELS) / BYTES_PER_SAMPLE;

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
  _mediaStreamOutputs: Record<number, GainNode>;

  /** Raw media stream for each external audio source e.g. microphone or virtual audio cables */
  _externalAudioStreams: Record<string, MediaStream>;
  _externalAudioStreamOutputs: Record<string, GainNode>;

  constructor() {
    this._mediaStreams = {};
    this._mediaStreamOutputs = {};

    this._externalAudioStreams = {};
    this._externalAudioStreamOutputs = {};

    this._audioContext = new AudioContext({
      latencyHint: "playback",
      sampleRate: SAMPLE_RATE,
    });
    this._audioOutputNode = this._audioContext.createGain();
  }

  async load() {
    await this._setupWebsocket();
    await this._setupLoopback();
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
    this._startBrowserViewStream(viewId);
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

  toggleMaximize() {
    ipcRenderer.send("BROWSER_VIEW_TOGGLE_MAXIMIZE");
  }

  setMuted(id: number, muted: boolean) {
    // Mute the audio context node
    // Note: we can't use `webContents.setAudioMuted()` as we are capturing a
    // separate audio stream then what is being sent to the user
    if (this._mediaStreamOutputs[id]) {
      this._mediaStreamOutputs[id].gain.value = muted ? 0 : 1;
    }
  }

  /**
   * Toggle the playback of the view audio in the current window
   * @param {boolean} loopback
   */
  setLoopback(loopback: boolean) {
    this._audioOutputElement.muted = !loopback;
  }

  async startExternalAudioCapture(deviceId: string) {
    try {
      const streamConfig = {
        audio: {
          deviceId: deviceId,
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: false,
        },
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(
        streamConfig as any
      );

      this._externalAudioStreams[deviceId] = stream;

      const output = this._audioContext.createGain();
      this._externalAudioStreamOutputs[deviceId] = output;

      const audioSource = this._audioContext.createMediaStreamSource(stream);
      audioSource.connect(output);

      output.connect(this._audioOutputNode);
    } catch (error) {
      console.error(
        `Unable to start stream for external audio device ${deviceId}`
      );
      console.error(error);
    }
  }

  stopExternalAudioCapture(deviceId: string) {
    const stream = this._externalAudioStreams[deviceId];
    if (stream) {
      for (let track of stream.getTracks()) {
        track.stop();
      }
      delete this._externalAudioStreams[deviceId];
      delete this._externalAudioStreamOutputs[deviceId];
    }
  }

  async _setupWebsocket() {
    const websocketAddress = await ipcRenderer.invoke(
      "BROWSER_VIEW_GET_WEBSOCKET_ADDRESS"
    );
    streamSender.postMessage([
      "url",
      `ws://localhost:${websocketAddress.port}`,
    ]);
    streamSender.onmessage = (e: MessageEvent) => {
      if (e.data[0] === "error") {
        ipcRenderer.emit(
          "ERROR",
          null,
          `WebSocket closed with code ${e.data[1]}`
        );
      }
    };
  }

  async _setupLoopback() {
    // Create loopback media element
    const mediaDestination = this._audioContext.createMediaStreamDestination();
    this._audioOutputNode.connect(mediaDestination);

    this._audioOutputElement = document.createElement("audio");
    this._audioOutputElement.srcObject = mediaDestination.stream;
    this._audioOutputElement.onloadedmetadata = () => {
      this._audioOutputElement.play();
    };
  }

  /**
   * Start the internal PCM stream for communicating between the renderer and main context
   */
  async startBrowserStream(streamingMode: "lowLatency" | "performance") {
    ipcRenderer.send(
      "BROWSER_VIEW_STREAM_START",
      NUM_CHANNELS,
      FRAME_SIZE,
      SAMPLE_RATE
    );

    // Create PCM stream node
    await this._audioContext.audioWorklet.addModule(PCMStream);
    const pcmStreamNode = new AudioWorkletNode(
      this._audioContext,
      "pcm-stream",
      {
        parameterData: {
          bufferSize: streamingMode === "lowLatency" ? 256 : 64000,
        },
      }
    );
    pcmStreamNode.port.onmessage = (event) => {
      streamSender.postMessage(["data", event.data], [event.data.buffer]);
    };

    // Pipe the audio output into the stream
    this._audioOutputNode.connect(pcmStreamNode);
  }

  /**
   * Start an audio capture for the given browser view
   * @param viewId Browser view id
   */
  async _startBrowserViewStream(viewId: number) {
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

      const output = this._audioContext.createGain();
      this._mediaStreamOutputs[viewId] = output;

      const audioSource = this._audioContext.createMediaStreamSource(stream);
      audioSource.connect(output);

      output.connect(this._audioOutputNode);
    } catch (error) {
      console.error(`Unable to start stream for web view ${viewId}`);
      console.error(error);
    }
  }
}
