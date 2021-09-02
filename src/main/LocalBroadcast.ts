import { Readable, Writable } from 'stream';
import Throttle from 'throttle';
import prism from 'prism-media';

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

  play(input: Readable): Throttle {
    // Ensure it is encoded as an mp3
    const transcoder = new prism.FFmpeg({
      args: [
        '-analyzeduration',
        '0',
        '-loglevel',
        '0',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-f',
        'mp3',
      ],
    });
    const throttle = new Throttle(48000);
    const dispatcher = input.pipe(transcoder).pipe(throttle);

    // Send data from the dispatcher to all the current listeners
    dispatcher.on('data', (chunk) => {
      for (const listener of this._listeners) {
        listener.write(chunk);
      }
    });

    return dispatcher;
  }
}
