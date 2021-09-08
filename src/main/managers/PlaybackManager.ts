import { BrowserWindow } from 'electron';
import { DiscordBroadcast } from '../broadcast/DiscordBroadcast';
import { BroadcastManager } from './BroadcastManager';
import { BrowserViewManagerMain } from './BrowserViewManagerMain';

export class PlaybackManager {
  broadcast: BroadcastManager;
  discord: DiscordBroadcast;
  viewManager: BrowserViewManagerMain;
  constructor(window: BrowserWindow) {
    this.broadcast = new BroadcastManager();
    this.discord = new DiscordBroadcast();
    this.viewManager = new BrowserViewManagerMain(window);

    this.broadcast.addBroadcast(this.discord.broadcast);

    this.broadcast.play(this.viewManager.outputStream);
  }
}
