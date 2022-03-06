import { Howl } from "howler";
import { TypedEmitter } from "tiny-typed-emitter";

export interface FadeEvents {
  error: () => void;
  load: (duration: number) => void;
  end: () => void;
}

type LoopOptions = {
  src: string;
  volume: number;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
};

/**
 * Cross fade wrapper around a Howler sound playback
 */
export class Loop extends TypedEmitter<FadeEvents> {
  options: LoopOptions;
  /** Timeout that controls the cross-fade */
  _timeout: NodeJS.Timeout;
  /** Current howl audio playabck for this loop */
  _howl: Howl;

  constructor(options: LoopOptions) {
    super();
    this.options = options;
    try {
      const createHowlerInstance = () => {
        const howl = new Howl({
          ...this.options,
          loop: false,
          volume: 0,
          autoplay: true,
        });

        const handlePlay = () => {
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
          this.emit("end");
        };

        const handleError = () => {
          this.emit("error");
        };

        howl.on("play", handlePlay);
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
    return this._howl.seek(to);
  }
}
