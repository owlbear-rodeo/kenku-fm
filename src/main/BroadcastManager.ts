import Discord from 'discord.js';
import ytdl from 'ytdl-core';
import { LocalBroadcast } from './LocalBroadcast';
import { PassThrough } from 'stream';

export class BroadcastManager {
  local: LocalBroadcast;
  discord: Discord.VoiceBroadcast;
  _discordDispatcher?: Discord.BroadcastDispatcher;
  _localDispatcher?: PassThrough;

  constructor(client: Discord.Client) {
    this.local = new LocalBroadcast();
    if (client.voice) {
      this.discord = client.voice.createBroadcast();
    } else {
      throw Error('No voice manager available');
    }
  }

  resume() {
    this._localDispatcher?.resume();
    this._discordDispatcher?.resume();
  }

  async play(url: string) {
    // Cleanup old dispatchers
    this._localDispatcher?.destroy();
    this._discordDispatcher?.destroy();

    const info = await ytdl.getInfo(url);
    const discordStream = ytdl.downloadFromInfo(info, { filter: 'audioonly' });
    // Duplicate stream for local output
    const localStream = new PassThrough();
    discordStream.on('data', (chunk) => {
      localStream.write(chunk);
    });

    this._localDispatcher = this.local.play(localStream);
    this._discordDispatcher = this.discord.play(discordStream);

    return this._discordDispatcher;
  }

  pause() {
    this._localDispatcher?.pause();
    this._discordDispatcher?.pause();
  }

  stop() {
    this._localDispatcher?.destroy();
    this._discordDispatcher?.destroy();
  }
}
