import { BrowserWindow } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  viewManager: BrowserViewManagerMain;
  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast(window);
    this.viewManager = new BrowserViewManagerMain(window);
    this.viewManager.on(
      "streamStart",
      (stream, frameDuration, frameSize, sampleRate) => {
        this.discord.broadcast.play(stream, {
          format: "opusPackets",
          frameDuration,
          frameSize,
          samplingRate: sampleRate,
        });
      }
    );
    this.viewManager.on("streamEnd", () => {
      this.discord.broadcast.stopPlaying();
    });
  }

  destroy() {
    this.discord.destroy();
    this.viewManager.destroy();
  }
}
