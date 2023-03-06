import { ipcRenderer } from "electron";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import SharedBuffer from "./SharedBuffer.worklet";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Sync from "./StreamSync.worker";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Sender from "./StreamSender.worker";

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

/** Worklet uses Float32 samples */
const WORKLET_BYTES_PER_SAMPLE = Float32Array.BYTES_PER_ELEMENT;
const WORKLET_BUFFER_LENGTH = 8192;
const WORKLET_KERNEL_LENGTH = FRAME_SIZE * WORKLET_BYTES_PER_SAMPLE;
const WORKLET_STATE_BUFFER_LENGTH = 16;
const WORKLET_BYTES_PER_STATE = Float32Array.BYTES_PER_ELEMENT;

const STATE = {
  REQUEST_SEND: 0,
  FRAMES_AVAILABLE: 1,
  READ_INDEX: 2,
  WRITE_INDEX: 3,
  BUFFER_LENGTH: 4,
  KERNEL_LENGTH: 5,
};

/**
 * Capture audio from browser views and external audio devices
 */
export class AudioCapture {
  /** Audio context to mix media streams into one audio output */
  _audioContext?: AudioContext;
  /** Audio output node that streams will connect to */
  _audioOutputNode?: AudioNode;

  /** Audio DOM element for the current output / local playback */
  _audioOutputElement?: HTMLAudioElement;
  /** Raw media streams for each browser view containing webp/opus audio */
  _mediaStreams: Record<number, MediaStream> = {};
  _mediaStreamOutputs: Record<number, GainNode> = {};

  /** Raw media stream for each external audio source e.g. microphone or virtual audio cables */
  _externalAudioStreams: Record<string, MediaStream> = {};
  _externalAudioStreamOutputs: Record<string, GainNode> = {};

  /**
   * Create the Audio Context, setup the communication socket and start the
   * internal PCM stream for communicating between the renderer and main context
   */
  async start(streamingMode: "lowLatency" | "performance"): Promise<void> {
    this._audioContext = new AudioContext({
      // Setting the latency hint to `playback` fixes audio glitches on some Windows 11 machines.
      latencyHint: "playback",
      sampleRate: SAMPLE_RATE,
    });
    this._audioOutputNode = this._audioContext.createGain();

    await this._setupLoopback();

    ipcRenderer.send(
      "AUDIO_CAPTURE_STREAM_START",
      NUM_CHANNELS,
      FRAME_SIZE,
      SAMPLE_RATE
    );

    const buffers = Array.from(Array(NUM_CHANNELS)).map(
      () =>
        new SharedArrayBuffer(WORKLET_BUFFER_LENGTH * WORKLET_BYTES_PER_SAMPLE)
    );
    const states = new SharedArrayBuffer(
      WORKLET_STATE_BUFFER_LENGTH * WORKLET_BYTES_PER_STATE
    );

    const States = new Int32Array(states);
    Atomics.store(States, STATE.BUFFER_LENGTH, WORKLET_BUFFER_LENGTH);
    Atomics.store(States, STATE.KERNEL_LENGTH, WORKLET_KERNEL_LENGTH);

    // Create shared buffer worklet
    await this._audioContext.audioWorklet.addModule(SharedBuffer);
    const sharedBufferNode = new AudioWorkletNode(
      this._audioContext,
      "shared-buffer"
    );
    sharedBufferNode.port.postMessage({ states, buffers });

    // Pipe the audio output into the stream
    this._audioOutputNode.connect(sharedBufferNode);

    // Create websocket sender thread
    const streamSender: Worker = new Sender();
    const websocketAddress = await ipcRenderer.invoke(
      "AUDIO_CAPTURE_GET_WEBSOCKET_ADDRESS"
    );
    streamSender.postMessage({
      message: "init",
      address: `ws://localhost:${websocketAddress.port}`,
    });

    // Create an audio sync thread
    const streamSync: Worker = new Sync();
    streamSync.postMessage({
      states,
      buffers,
    });
    streamSync.onmessage = (event) => {
      streamSender.postMessage({ message: "data", data: event.data }, [
        event.data.buffer,
      ]);
    };
  }

  setMuted(id: number, muted: boolean): void {
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
  setLoopback(loopback: boolean): void {
    this._audioOutputElement.muted = !loopback;
  }

  async startExternalAudioCapture(deviceId: string): Promise<void> {
    try {
      const streamConfig: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId,
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: false,
        },
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(streamConfig);

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
      ipcRenderer.emit(
        "ERROR",
        null,
        `Unable to start stream for external audio device ${deviceId}`
      );
      console.error(error);
    }
  }

  stopExternalAudioCapture(deviceId: string): void {
    const stream = this._externalAudioStreams[deviceId];
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      delete this._externalAudioStreams[deviceId];
      delete this._externalAudioStreamOutputs[deviceId];
    }
  }

  async _setupLoopback(): Promise<void> {
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
   * Start an audio capture for the given browser view
   * @param viewId Browser view id
   * @param mediaSourceId The media source id to use with `getUserMedia`
   */
  async startBrowserViewStream(
    viewId: number,
    mediaSourceId: string
  ): Promise<void> {
    try {
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
        // Reason
        // We use custom chromium MediaStreamConfig values here to capture the tabs audio
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      ipcRenderer.emit(
        "ERROR",
        null,
        `Unable to start stream for web view ${viewId}`
      );
      console.error(error);
    }
  }

  /**
   * Stop an audio capture for the given browser view
   * @param viewId Browser view id
   */
  stopBrowserViewStream(viewId: number): void {
    if (this._mediaStreams[viewId]) {
      for (const track of this._mediaStreams[viewId].getTracks()) {
        track.stop();
      }
      delete this._mediaStreams[viewId];
    }
  }
}
