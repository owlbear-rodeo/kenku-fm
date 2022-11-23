import { BrowserWindow } from "electron";
import { DiscordBroadcast } from "../broadcast/DiscordBroadcast";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";

export class PlaybackManager {
  discord: DiscordBroadcast;
  audioCaptureManager: AudioCaptureManagerMain;

  constructor(window: BrowserWindow) {
    this.discord = new DiscordBroadcast(window);
    this.audioCaptureManager = new AudioCaptureManagerMain();
    this.audioCaptureManager.on(
      "streamStart",
      (stream, frameDuration, frameSize, sampleRate) => {
        this.discord.broadcast.play(stream, {
          format: "opusPackets",
          frameDuration,
          frameSize,
          samplingRate: sampleRate,
          voiceDataTimeout: 60000,
        });
      }
    );
    this.audioCaptureManager.on("streamEnd", () => {
      this.discord.broadcast.stopPlaying();
    });
  }

  destroy() {
    this.discord.destroy();
    this.audioCaptureManager.destroy();
  }
}
