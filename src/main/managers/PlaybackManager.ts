import { createAudioResource, StreamType } from "@discordjs/voice";
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
      const resource = createAudioResource(stream);
      this.discord.audioPlayer.play(resource);
    });
    this.viewManager.on("streamEnd", () => {
      this.discord.audioPlayer.stop();
    });
  }

  destroy() {
    this.discord.destroy();
    this.viewManager.destroy();
  }
}
