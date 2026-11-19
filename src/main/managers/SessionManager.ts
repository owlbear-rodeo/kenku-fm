import { BrowserWindow } from "electron";
import type { AudioPlayer } from "@discordjs/voice";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";
import { PlaybackManager } from "./PlaybackManager";
import { PlayerManager } from "./PlayerManager";
import { WindowManager } from "./WindowManager";

export class SessionManager {
  private playbackManager: PlaybackManager;
  private playerManager: PlayerManager;
  private viewManager: BrowserViewManagerMain;
  private windowManager: WindowManager;

  constructor(window: BrowserWindow, audioPlayer: AudioPlayer) {
    this.playbackManager = new PlaybackManager(audioPlayer);
    this.viewManager = new BrowserViewManagerMain(window);
    this.windowManager = new WindowManager(window);
    this.playerManager = new PlayerManager();
  }

  destroy() {
    this.playbackManager.destroy();
    this.viewManager.destroy();
    this.windowManager.destroy();
    this.playerManager.destroy();
  }
}
