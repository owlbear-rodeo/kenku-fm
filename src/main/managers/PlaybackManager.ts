import { BrowserWindow } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  viewManager: BrowserViewManagerMain;
  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast(window);
    this.viewManager = new BrowserViewManagerMain(window);
    this.viewManager.on("streamStart", (stream) => {
      this.discord.broadcast.play(stream, {
        format: "webm",
        // Increase frame duration to match MediaRecorder and prevent stutter
        frameDuration: 60,
      });
    });
    this.viewManager.on("streamEnd", () => {
      this.discord.broadcast.stopPlaying();
    });
  }

  destroy() {
    this.discord.destroy();
    this.viewManager.destroy();
  }
}
