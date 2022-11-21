import { createAudioResource, StreamType } from "@discordjs/voice";
import { BrowserWindow, WebContents } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";
import { BrowserViewManagerMain } from "./BrowserViewManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  viewManager: BrowserViewManagerMain;
  audioCaptureManager: AudioCaptureManagerMain;

  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast(window);
    this.viewManager = new BrowserViewManagerMain(window);
    this.audioCaptureManager = new AudioCaptureManagerMain();
    this.audioCaptureManager.on("streamStart", (stream) => {
      const resource = createAudioResource(stream);
      this.discord.audioPlayer.play(resource);
    });
    this.audioCaptureManager.on("streamEnd", () => {
      this.discord.audioPlayer.stop();
    });
  }

  destroy() {
    this.discord.destroy();
    this.viewManager.destroy();
    this.audioCaptureManager.destroy();
  }
}
