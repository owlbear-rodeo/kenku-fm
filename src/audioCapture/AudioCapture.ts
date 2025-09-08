/** Sample rate of the audio context */
const SAMPLE_RATE = 48000;

/**
 * Capture audio from browser views and external audio devices
 */
export class AudioCapture {
  /** Audio context to mix media streams into one audio output */
  private audioContext: AudioContext;
  /** Audio output node that streams will connect to */
  private audioOutputNode: AudioNode;

  /** Audio DOM element for the current output / local playback */
  private audioOutputElement: HTMLAudioElement;
  /** Raw media streams for each browser view containing webp/opus audio */
  private mediaStreams: Record<number, MediaStream> = {};
  private mediaStreamOutputs: Record<number, GainNode> = {};

  /** Raw media stream for each external audio source e.g. microphone or virtual audio cables */
  private externalAudioStreams: Record<string, MediaStream> = {};
  private externalAudioStreamOutputs: Record<string, GainNode> = {};

  outputStream: MediaStream;

  /**
   * Create the Audio Context, setup the communication socket and start the RTC stream for communicating with the Rust process
   */
  constructor() {
    this.audioContext = new AudioContext({
      // Setting the latency hint to `playback` fixes audio glitches on some Windows 11 machines.
      latencyHint: "playback",
      sampleRate: SAMPLE_RATE,
    });
    this.audioOutputNode = this.audioContext.createGain();

    const mediaDestination = this.audioContext.createMediaStreamDestination();
    this.audioOutputNode.connect(mediaDestination);

    this.outputStream = mediaDestination.stream;

    // Setup loopback element for local playback
    this.audioOutputElement = document.createElement("audio");
    this.audioOutputElement.srcObject = mediaDestination.stream;
    this.audioOutputElement.onloadedmetadata = () => {
      this.audioOutputElement.play();
    };
  }

  setMuted(id: number, muted: boolean): void {
    // Mute the audio context node
    // Note: we can't use `webContents.setAudioMuted()` as we are capturing a
    // separate audio stream then what is being sent to the user
    if (this.mediaStreamOutputs[id]) {
      this.mediaStreamOutputs[id].gain.value = muted ? 0 : 1;
    }
  }

  /**
   * Toggle the playback of the view audio in the current window
   * @param {boolean} loopback
   */
  setLoopback(loopback: boolean): void {
    this.audioOutputElement.muted = !loopback;
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

      this.externalAudioStreams[deviceId] = stream;

      const output = this.audioContext.createGain();
      this.externalAudioStreamOutputs[deviceId] = output;

      const audioSource = this.audioContext.createMediaStreamSource(stream);
      audioSource.connect(output);

      output.connect(this.audioOutputNode);
    } catch (error) {
      window.capture.log(
        "error",
        `Unable to start stream for external audio device ${deviceId}: ${error.message}`
      );
      window.capture.error(
        `Unable to start stream for external audio device ${deviceId}`
      );
    }
  }

  stopExternalAudioCapture(deviceId: string): void {
    const stream = this.externalAudioStreams[deviceId];
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      delete this.externalAudioStreams[deviceId];
      delete this.externalAudioStreamOutputs[deviceId];
    }
  }

  async _setupLoopback(): Promise<void> {
    // Create loopback media element
    const mediaDestination = this.audioContext.createMediaStreamDestination();
    this.audioOutputNode.connect(mediaDestination);

    this.audioOutputElement = document.createElement("audio");
    this.audioOutputElement.srcObject = mediaDestination.stream;
    this.audioOutputElement.onloadedmetadata = () => {
      this.audioOutputElement.play();
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
      this.mediaStreams[viewId] = stream;

      const output = this.audioContext.createGain();
      this.mediaStreamOutputs[viewId] = output;

      const audioSource = this.audioContext.createMediaStreamSource(stream);
      audioSource.connect(output);

      output.connect(this.audioOutputNode);
    } catch (error) {
      window.capture.log(
        "error",
        `Unable to start stream for web view ${viewId}: ${error.message}`
      );
      window.capture.error(`Unable to start stream for web view ${viewId}`);
    }
  }

  /**
   * Stop an audio capture for the given browser view
   * @param viewId Browser view id
   */
  stopBrowserViewStream(viewId: number): void {
    if (this.mediaStreams[viewId]) {
      for (const track of this.mediaStreams[viewId].getTracks()) {
        track.stop();
      }
      delete this.mediaStreams[viewId];
    }
  }

  stopAllBrowserViewStreams(): void {
    for (let viewId in this.mediaStreams) {
      for (const track of this.mediaStreams[viewId].getTracks()) {
        track.stop();
      }
      delete this.mediaStreams[viewId];
    }
  }
}
