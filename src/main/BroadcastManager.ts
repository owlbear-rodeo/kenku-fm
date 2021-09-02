import Discord from 'discord.js';
import { Readable } from 'stream';
import Throttle from 'throttle';
import { LocalBroadcast } from './LocalBroadcast';

export class BroadcastManager {
  local: LocalBroadcast;
  discord: Discord.VoiceBroadcast;
  playId?: string;
  _discordDispatcher?: Discord.BroadcastDispatcher;
  _localDispatcher?: Throttle;

  constructor(client: Discord.Client) {
    this.local = new LocalBroadcast();
    if (client.voice) {
      this.discord = client.voice?.createBroadcast();
    } else {
      throw Error('No voice manager available');
    }
  }

  resume() {
    this._localDispatcher?.resume();
    this._discordDispatcher?.resume();
  }

  play(input: Readable, id: string) {
    // Cleanup old dispatchers
    this._localDispatcher?.destroy();
    this._discordDispatcher?.destroy();
    // Store current playing item so we can check the id to resume
    this.playId = id;

    this._localDispatcher = this.local.play(input);
    this._discordDispatcher = this.discord.play(input);
    return this._discordDispatcher;
  }

  pause() {
    this._localDispatcher?.pause();
    this._discordDispatcher?.pause();
  }
}
