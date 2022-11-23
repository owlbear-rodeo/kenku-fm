import { createAudioResource } from "@discordjs/voice";
import { BrowserWindow } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  audioCaptureManager: AudioCaptureManagerMain;

  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast(window);
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
    this.audioCaptureManager.destroy();
  }
}
