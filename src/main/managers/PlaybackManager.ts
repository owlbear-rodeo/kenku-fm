import { BrowserWindow } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  viewManager: BrowserViewManagerMain;
  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast();
    this.viewManager = new BrowserViewManagerMain(window);

    this.discord.broadcast.play(this.viewManager.outputStream, {
      type: "converted",
    });
  }
}
