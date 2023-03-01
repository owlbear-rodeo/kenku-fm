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
      this.discord.broadcast.play(stream, {
        format: "opusPackets",
        frameDuration: 20,
        frameSize: 960,
        samplingRate: 48000,
        voiceDataTimeout: 60000,
      });
    });
    this.audioCaptureManager.on("streamEnd", () => {
      this.discord.broadcast.stopPlaying();
    });
  }

  destroy() {
    this.discord.destroy();
    this.audioCaptureManager.destroy();
  }
}
