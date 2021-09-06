import { BrowserWindow } from 'electron';
import { DiscordBroadcast } from '../broadcast/DiscordBroadcast';
import { LocalBroadcast } from '../broadcast/LocalBroadcast';
import { BroadcastManager } from './BroadcastManager';
import { BrowserViewManagerMain } from './BrowserViewManagerMain';

export class PlaybackManager {
  broadcast: BroadcastManager;
  discord: DiscordBroadcast;
  local: LocalBroadcast;
  viewManager: BrowserViewManagerMain;
  constructor(window: BrowserWindow) {
    this.broadcast = new BroadcastManager();
    this.discord = new DiscordBroadcast();
    this.local = new LocalBroadcast();
    this.viewManager = new BrowserViewManagerMain(window);

    this.broadcast.addBroadcast(this.discord.broadcast);
    this.broadcast.addBroadcast(this.local);

    this.broadcast.play(this.viewManager.outputStream);
  }
}
