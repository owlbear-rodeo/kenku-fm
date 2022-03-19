import { Howl } from "howler";
import { TypedEmitter } from "tiny-typed-emitter";

export interface SoundEvents {
  error: () => void;
  load: (duration: number) => void;
  end: () => void;
}

type SoundOptions = {
  src: string;
  volume: number;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
};

/**
 * Cross fade wrapper around a Howler sound playback.
 * Setting fadeIn and fadeOut to 0 will disable cross fading.
 * If cross fading is disabled then HTML5 audio won't be used
 * this increases the memory usage but allows for perfect loops.
 */
export class Sound extends TypedEmitter<SoundEvents> {
  options: SoundOptions;
  /** Timeout that controls the cross-fade */
  _timeout: NodeJS.Timeout;
  /** Current howl audio playabck for this loop */
  _howl: Howl;

  constructor(options: SoundOptions) {
    super();
    this.options = options;
    try {
      const createHowlerInstance = () => {
        const crossFade =
          this.options.fadeIn !== 0 && this.options.fadeOut !== 0;
        const howl = new Howl({
          ...this.options,
          loop: crossFade ? false : this.options.loop,
          volume: crossFade ? 0 : this.options.volume,
          autoplay: true,
          // Disable html audio when not cross fading to allow for perfect looping
          html5: crossFade,
        });

        const handleCrossFade = () => {
          // Fade in
          howl.fade(0, this.options.volume, options.fadeIn);
          // Fade out
          this._timeout = setTimeout(() => {
            if (this.options.loop) {
              // Cross fade on loop
              howl.once("fade", () => {
                howl.stop();
              });
              howl.fade(howl.volume(), 0, this.options.fadeOut);
              createHowlerInstance();
            } else {
              // Basic fade out when not looping
              howl.fade(howl.volume(), 0, this.options.fadeOut);
            }
          }, Math.floor(howl.duration() * 1000) - this.options.fadeOut);
        };

        const handleLoad = () => {
          this.emit("load", howl.duration());
        };

        const handleEnd = () => {
          if (!this.options.loop) {
            this.emit("end");
          }
        };

        const handleError = () => {
          this.emit("error");
        };

        if (crossFade) {
          howl.on("play", handleCrossFade);
        }
        howl.on("load", handleLoad);
        howl.on("end", handleEnd);
        howl.on("loaderror", handleError);
        howl.on("playerror", handleError);

        const howlSound = (howl as any)._sounds[0];
        if (!howlSound) {
          handleError();
        }

        this._howl = howl;
      };
      createHowlerInstance();
    } catch {
      this.emit("error");
    }
  }

  async stop(fadeOut: boolean): Promise<void> {
    return new Promise((resolve) => {
      clearTimeout(this._timeout);
      if (fadeOut) {
        this._howl.once("fade", () => {
          this._howl.unload();
          resolve();
        });
        this._howl.fade(this._howl.volume(), 0, this.options.fadeOut);
      } else {
        this._howl.unload();
        resolve();
      }
    });
  }

  playing() {
    return this._howl.playing();
  }

  progress() {
    return this._howl.seek();
  }

  seek(to: number) {
    this._howl.seek(to);
  }

  volume(volume: number) {
    this.options.volume = volume;
    this._howl.volume(volume);
  }

  loop(loop: boolean) {
    this.options.loop = loop;
    // Toggle howl loop if cross fade is disabled
    if (this.options.fadeIn === 0 && this.options.fadeOut === 0) {
      this._howl.loop(loop);
    }
  }
}
