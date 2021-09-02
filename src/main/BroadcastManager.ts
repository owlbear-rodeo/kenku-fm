import Discord from 'discord.js';
import { Readable } from 'stream';
import { LocalBroadcast } from './LocalBroadcast';

export class BroadcastManager {
  local: LocalBroadcast;
  discord: Discord.VoiceBroadcast;

  constructor(client: Discord.Client) {
    this.local = new LocalBroadcast();
    if (client.voice) {
      this.discord = client.voice?.createBroadcast();
    } else {
      throw Error('No voice manager available');
    }
  }

  play(input: Readable) {
    this.local.play(input);
    return this.discord.play(input);
  }
}
