import { BrowserWindow } from "electron";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";
import { DiscordManager } from "./DiscordManager";

export class PlaybackManager {
  discord: DiscordManager;
  audioCaptureManager: AudioCaptureManagerMain;

  constructor(window: BrowserWindow) {
    this.audioCaptureManager = new AudioCaptureManagerMain();
    this.discord = new DiscordManager(window, this.audioCaptureManager);
  }

  destroy() {
    this.discord.destroy();
    this.audioCaptureManager.destroy();
  }
}
