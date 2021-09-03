import { PassThrough, Readable, Writable } from 'stream';
import prism from 'prism-media';

const BITRATE = 48000;
const CHANNELS = 2;

/**
 * Local broadcaster that encodes and audio stream as mp3
 * and broadcasts it to the current listeners
 */
export class LocalBroadcast {
  _listeners: Writable[] = [];

  add(listener: Writable) {
    this._listeners.push(listener);
  }

  remove(listener: Writable) {
    const index = this._listeners.indexOf(listener);
    if (index >= 0) {
      this._listeners.splice(index);
    }
  }

  play(input: Readable): PassThrough {
    // Ensure it is encoded as an mp3
    const transcoder = new prism.FFmpeg({
      args: [
        '-analyzeduration',
        '0',
        '-loglevel',
        '0',
        '-ar',
        `${BITRATE}`,
        '-ac',
        `${CHANNELS}`,
        '-f',
        'mp3',
      ],
    });
    const output = new PassThrough();
    const dispatcher = input.pipe(transcoder).pipe(output);

    // Send data from the dispatcher to all the current listeners
    dispatcher.on('data', (chunk) => {
      for (const listener of this._listeners) {
        listener.write(chunk);
      }
    });

    return dispatcher;
  }
}
