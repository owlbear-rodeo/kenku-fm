import { BrowserWindow } from "electron";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";
import { DiscordManager } from "./DiscordManager";

export class PlaybackManager {
  discord: DiscordManager;
  audioCaptureManager: AudioCaptureManagerMain;

  constructor(window: BrowserWindow) {
    this.discord = new DiscordManager(window);
    this.audioCaptureManager = new AudioCaptureManagerMain();
  }

  destroy() {
    this.discord.destroy();
    this.audioCaptureManager.destroy();
  }
}
