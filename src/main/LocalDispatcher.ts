import { StreamOptions, VoiceBroadcast } from 'discord.js';

import prism from 'prism-media';

import { PassThrough, Writable } from 'stream';

const FRAME_LENGTH = 20;
const CHANNELS = 2;
const TIMESTAMP_INC = (48000 / 100) * CHANNELS;
const DEFAULT_BITRATE = 48;

type Streams = {
  broadcast?: any;
  input?: any;
  ffmpeg?: any;
  opus?: any;
  volume?: any;
  silence?: any;
};

/**
 * Stripped back implementation of Discord.js#StreamDispatcher
 */
export class LocalDispatcher extends Writable {
  streamOptions: StreamOptions;
  streams: Streams;
  broadcast: VoiceBroadcast | null;
  /// The time that the stream was paused at (null if not paused)
  pausedSince: number | null;
  startTime: number = 0;
  _pausedTime: number;
  _silentPausedTime: number;
  _silence: boolean = false;
  count: number;
  _sdata = {
    channels: 2,
    sequence: 0,
    timestamp: 0,
  };
  _writeCallback: any;
  // _input = new PassThrough();
  output = new prism.FFmpeg({
    args: [
      '-analyzeduration',
      '0',
      '-loglevel',
      '0',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-acodec',
      'libmp3lame',
    ],
  });

  constructor(
    options: StreamOptions = {
      seek: 0,
      volume: 1,
      bitrate: 96,
      highWaterMark: 12,
    },
    streams: Streams
  ) {
    super(options);
    const { volume, fec, plp, bitrate } = options;
    this.streamOptions = options;
    this.streams = streams;

    this.pausedSince = null;

    this.broadcast = this.streams.broadcast || null;

    this._pausedTime = 0;
    this._silentPausedTime = 0;
    this.count = 0;

    // this._input.pipe(this.output);

    this.on('finish', () => {
      this._cleanup();
    });

    this.setVolume(volume);
    this.setBitrate(bitrate);
    if (typeof fec !== 'undefined') this.setFEC(fec);
    if (typeof plp !== 'undefined') this.setPLP(plp);

    const streamError = (type?: string, err?: Error) => {
      /**
       * Emitted when the dispatcher encounters an error.
       * @event StreamDispatcher#error
       */
      if (type && err) {
        err.message = `${type} stream: ${err.message}`;
        this.emit('error', err);
      }
      this.destroy();
    };

    this.on('error', () => streamError());
    if (this.streams.input)
      this.streams.input.on('error', (err: Error) => streamError('input', err));
    if (this.streams.ffmpeg)
      this.streams.ffmpeg.on('error', (err: Error) =>
        streamError('ffmpeg', err)
      );
    if (this.streams.opus)
      this.streams.opus.on('error', (err: Error) => streamError('opus', err));
    if (this.streams.volume)
      this.streams.volume.on('error', (err: Error) =>
        streamError('volume', err)
      );
  }

  _destroy(err: any, cb: any) {
    this._cleanup();
    super._destroy(err, cb);
  }

  _cleanup() {
    const { streams } = this;
    if (streams.broadcast) streams.broadcast.delete(this);
    if (streams.opus) streams.opus.destroy();
    if (streams.ffmpeg) streams.ffmpeg.destroy();
  }

  /**
   * Pauses playback
   * @param {boolean} [silence=false] Whether to play silence while paused to prevent audio glitches
   */
  pause(silence: boolean = false) {
    if (this.paused) return;
    if (this.streams.opus) this.streams.opus.unpipe(this);
    if (silence) {
      this.streams.silence.pipe(this);
      this._silence = true;
    }
    this.pausedSince = Date.now();
  }

  /**
   * Whether or not playback is paused
   * @type {boolean}
   * @readonly
   */
  get paused() {
    return Boolean(this.pausedSince);
  }

  /**
   * Total time that this dispatcher has been paused in milliseconds
   * @type {number}
   * @readonly
   */
  get pausedTime() {
    return (
      this._silentPausedTime +
      this._pausedTime +
      (this.paused && this.pausedSince !== null
        ? Date.now() - this.pausedSince
        : 0)
    );
  }

  /**
   * Resumes playback
   */
  resume() {
    if (!this.pausedSince) return;
    this.streams.silence.unpipe(this);
    if (this.streams.opus) this.streams.opus.pipe(this);
    if (this._silence) {
      this._silentPausedTime += Date.now() - this.pausedSince;
      this._silence = false;
    } else {
      this._pausedTime += Date.now() - this.pausedSince;
    }
    this.pausedSince = null;
  }

  /**
   * The time (in milliseconds) that the dispatcher has actually been playing audio for
   * @type {number}
   * @readonly
   */
  get streamTime() {
    return this.count * FRAME_LENGTH;
  }

  /**
   * The time (in milliseconds) that the dispatcher has been playing audio for, taking into account skips and pauses
   * @type {number}
   * @readonly
   */
  get totalStreamTime() {
    return Date.now() - this.startTime;
  }

  /**
   * Set the bitrate of the current Opus encoder if using a compatible Opus stream.
   * @param {number} value New bitrate, in kbps
   * If set to 'auto', the voice channel's bitrate will be used
   * @returns {boolean} true if the bitrate has been successfully changed.
   */
  setBitrate(value: number | 'auto' | undefined): boolean {
    if (!value || !this.bitrateEditable) return false;
    const bitrate = value === 'auto' ? DEFAULT_BITRATE : value;
    this.streams.opus.setBitrate(bitrate * 1000);
    return true;
  }

  /**
   * Sets the expected packet loss percentage if using a compatible Opus stream.
   * @param {number} value between 0 and 1
   * @returns {boolean} Returns true if it was successfully set.
   */
  setPLP(value: number): boolean {
    if (!this.bitrateEditable) return false;
    this.streams.opus.setPLP(value);
    return true;
  }

  /**
   * Enables or disables forward error correction if using a compatible Opus stream.
   * @param {boolean} enabled true to enable
   * @returns {boolean} Returns true if it was successfully set.
   */
  setFEC(enabled: boolean): boolean {
    if (!this.bitrateEditable) return false;
    this.streams.opus.setFEC(enabled);
    return true;
  }

  _write(chunk: any, enc: any, done: any) {
    if (!this.startTime) {
      /**
       * Emitted once the stream has started to play.
       * @event StreamDispatcher#start
       */
      this.emit('start');
      this.startTime = Date.now();
    }
    this.output.write(chunk, enc);
    this._step(done);
  }

  _step(done: any) {
    this._writeCallback = () => {
      this._writeCallback = null;
      done();
    };
    if (!this.streams.broadcast) {
      const next =
        FRAME_LENGTH +
        this.count * FRAME_LENGTH -
        (Date.now() - this.startTime - this._pausedTime);
      setTimeout(() => {
        if ((!this.pausedSince || this._silence) && this._writeCallback)
          this._writeCallback();
      }, next);
    }
    this._sdata.sequence++;
    this._sdata.timestamp += TIMESTAMP_INC;
    if (this._sdata.sequence >= 2 ** 16) this._sdata.sequence = 0;
    if (this._sdata.timestamp >= 2 ** 32) this._sdata.timestamp = 0;
    this.count++;
  }

  _final(callback: any) {
    this._writeCallback = null;
    callback();
  }

  _playChunk() {
    throw Error('`_playChunk` unavailable for local dispatcher');
  }

  _encrypt() {
    throw Error('`_encrypt` unavailable for local dispatcher');
  }

  _createPacket() {
    throw Error('_createPacker unavailable for local dispatcher');
  }

  _sendPacket() {
    throw Error('_sendPacket unavailable for local dispatcher');
  }

  _setSpeaking() {
    throw Error('_setSpeaking unavailable for local dispatcher');
  }

  get volumeEditable() {
    return Boolean(this.streams.volume);
  }

  /**
   * Whether or not the Opus bitrate of this stream is editable
   * @type {boolean}
   * @readonly
   */
  get bitrateEditable() {
    return this.streams.opus && this.streams.opus.setBitrate;
  }

  // Volume
  get volume() {
    return this.streams.volume ? this.streams.volume.volume : 1;
  }

  setVolume(value: number | boolean | undefined) {
    if (!this.streams.volume) return false;
    /**
     * Emitted when the volume of this dispatcher changes.
     * @event StreamDispatcher#volumeChange
     * @param {number} oldVolume The old volume of this dispatcher
     * @param {number} newVolume The new volume of this dispatcher
     */
    this.emit('volumeChange', this.volume, value);
    this.streams.volume.setVolume(value);
    return true;
  }

  get volumeDecibels() {
    throw Error('volumeDecibels unavailable for local dispatcher');
  }
  get volumeLogarithmic() {
    throw Error('volumeLogarithmic unavailable for local dispatcher');
  }
  setVolumeDecibels() {}
  setVolumeLogarithmic() {}
}
