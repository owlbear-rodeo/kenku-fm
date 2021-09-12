import { BrowserWindow } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  viewManager: BrowserViewManagerMain;
  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast();
    this.viewManager = new BrowserViewManagerMain(window);
    this.viewManager.on("streamStart", (stream) => {
      this.discord.broadcast.play(stream, {
        type: "webm/opus",
      });
    });
    this.viewManager.on("streamEnd", () => {
      this.discord.broadcast.end();
    });
  }

  destroy() {
    this.discord.destroy();
    this.viewManager.destroy();
  }
}
