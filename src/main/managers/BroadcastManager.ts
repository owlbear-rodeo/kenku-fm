import Discord from 'discord.js';
import { LocalBroadcast } from '../broadcast/LocalBroadcast';
import { PassThrough, Readable } from 'stream';

export class BroadcastManager {
  broadcasts: (LocalBroadcast | Discord.VoiceBroadcast)[] = [];
  _dispatchers: (PassThrough | Discord.BroadcastDispatcher)[] = [];

  addBroadcast(broadcast: LocalBroadcast | Discord.VoiceBroadcast) {
    this.broadcasts.push(broadcast);
  }

  resume() {
    for (let dispatcher of this._dispatchers) {
      dispatcher.resume();
    }
  }

  async play(stream: Readable) {
    this.stop();

    if (this.broadcasts.length === 0) {
      throw Error('No available broadcasts');
    }

    const initialDispatcher = this.broadcasts[0].play(stream);
    this._dispatchers.push(initialDispatcher);

    // Duplicate stream to other broadcasts
    for (let i = 1; i < this.broadcasts.length; i++) {
      const broadcast = this.broadcasts[i];
      const duplicateStream = new PassThrough();
      stream.on('data', (chunk) => {
        duplicateStream.write(chunk);
      });
      if (broadcast instanceof Discord.VoiceBroadcast) {
        broadcast.play(duplicateStream, { type: 'webm/opus' });
      } else {
        broadcast.play(duplicateStream);
      }
    }

    return initialDispatcher;
  }

  pause() {
    for (let dispatcher of this._dispatchers) {
      dispatcher.pause();
    }
  }

  stop() {
    for (let dispatcher of this._dispatchers) {
      dispatcher.destroy();
    }
    this._dispatchers = [];
  }
}
