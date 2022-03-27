import { BrowserWindow } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  viewManager: BrowserViewManagerMain;
  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast();
    this.viewManager = new BrowserViewManagerMain(window);
    this.viewManager.on(
      "streamStart",
      (stream, channels, frameSize, samplingRate) => {
        this.discord.broadcast.channels = channels;
        console.log("STREAM", channels, frameSize, samplingRate);
        this.discord.broadcast.play(stream, {
          format: "opusPackets",
          frameSize,
          samplingRate,
          frameDuration: 20,
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
