import { createAudioResource } from "@discordjs/voice";
import type { AudioPlayer } from "@discordjs/voice";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";

export class PlaybackManager {
  private readonly audioPlayer: AudioPlayer;
  audioCaptureManager: AudioCaptureManagerMain;

  constructor(audioPlayer: AudioPlayer) {
    this.audioPlayer = audioPlayer;
    this.audioCaptureManager = new AudioCaptureManagerMain();
    this.audioCaptureManager.on("streamStart", (stream) => {
      const resource = createAudioResource(stream);
      this.audioPlayer.play(resource);
    });
    this.audioCaptureManager.on("streamEnd", () => {
      this.audioPlayer.stop();
    });
  }

  destroy() {
    this.audioPlayer.stop();
    this.audioCaptureManager.destroy();
  }
}
