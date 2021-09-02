import { Readable, Writable } from 'stream';
import Throttle from 'throttle';
import prism from 'prism-media';

export class LocalBroadcast {
  _listeners: Writable[] = [];
  add(listener: Writable) {
    this._listeners.push(listener);
  }
  play(input: Readable) {
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
    input
      .pipe(transcoder)
      .pipe(throttle)
      .on('data', (chunk) => {
        for (const listener of this._listeners) {
          listener.write(chunk);
        }
      });
  }
}
