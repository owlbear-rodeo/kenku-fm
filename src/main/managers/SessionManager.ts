import { BrowserWindow } from "electron";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";
import { FaviconManager } from "./FaviconManager";
import { PlaybackManager } from "./PlaybackManager";
import { PlayerManager } from "./PlayerManager";
import { WindowManager } from "./WindowManager";

export class SessionManager {
  playbackManager: PlaybackManager;
  faviconManager: FaviconManager;
  playerManager: PlayerManager;
  viewManager: BrowserViewManagerMain;
  windowManager: WindowManager;

  constructor(window: BrowserWindow) {
    this.playbackManager = new PlaybackManager(window);
    this.viewManager = new BrowserViewManagerMain(window);
    this.windowManager = new WindowManager(window);
    this.faviconManager = new FaviconManager();
    this.playerManager = new PlayerManager();
  }

  destroy() {
    this.playbackManager.destroy();
    this.viewManager.destroy();
    this.windowManager.destroy();
    this.faviconManager.destroy();
    this.playerManager.destroy();
  }
}
