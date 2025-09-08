import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";
import { DiscordManager } from "./DiscordManager";

export class PlaybackManager {
  private discord: DiscordManager;
  private audioCaptureManager: AudioCaptureManagerMain;

  constructor() {
    this.audioCaptureManager = new AudioCaptureManagerMain();
    this.discord = new DiscordManager(this.audioCaptureManager);
  }

  destroy() {
    this.discord.destroy();
    this.audioCaptureManager.destroy();
  }
}
