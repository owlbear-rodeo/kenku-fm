import { BrowserView, BrowserWindow, ipcMain } from "electron";
import { FaviconManager } from "./FaviconManager";
import { PlaybackManager } from "./PlaybackManager";
import { PlayerManager } from "./PlayerManager";

export class SessionManager {
  playbackManager: PlaybackManager;
  faviconManager: FaviconManager;
  playerManager: PlayerManager;

  constructor(window: BrowserWindow) {
    this.playbackManager = new PlaybackManager(window);
    this.faviconManager = new FaviconManager();
    this.playerManager = new PlayerManager();
  }

  destroy() {
    this.playbackManager.destroy();
    this.faviconManager.destroy();
    this.playerManager.destroy();
  }
}
