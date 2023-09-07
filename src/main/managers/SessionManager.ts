import { BrowserWindow } from "electron";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";
import { FaviconManager } from "./FaviconManager";
import { PlaybackManager } from "./PlaybackManager";
import { PlayerManager } from "./PlayerManager";
import { WindowManager } from "./WindowManager";

export class SessionManager {
  private playbackManager: PlaybackManager;
  private faviconManager: FaviconManager;
  private playerManager: PlayerManager;
  private viewManager: BrowserViewManagerMain;
  private windowManager: WindowManager;

  constructor(window: BrowserWindow) {
    this.playbackManager = new PlaybackManager();
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
