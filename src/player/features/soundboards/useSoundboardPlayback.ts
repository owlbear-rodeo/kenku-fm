import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";

import { useDispatch } from "react-redux";
import {
  playSound,
  updatePlayback,
  stopSound,
} from "./soundboardPlaybackSlice";
import { Sound } from "./soundboardsSlice";

export function useSoundboardPlayback(onError: (message: string) => void) {
  const soundsRef = useRef<Record<string, Howl>>({});
  const dispatch = useDispatch();

  const play = useCallback(
    (sound: Sound) => {
      function error() {
        delete soundsRef.current[sound.id];
        dispatch(stopSound(sound.id));
        onError(`Unable to play sound: ${sound.title}`);
      }

      try {
        const howl = new Howl({
          src: sound.url,
          html5: true,
          loop: sound.repeat,
          volume: 0,
          autoplay: true,
        });
        soundsRef.current[sound.id] = howl;

        howl.on("play", () => {
          // Fade in
          howl.fade(0, sound.volume, sound.fadeIn);
          // Fade out
          setTimeout(() => {
            if (howl.playing()) {
              howl.fade(sound.volume, 0, sound.fadeOut);
            }
          }, Math.floor(howl.duration() * 1000) - sound.fadeOut);
        });

        howl.once("load", () => {
          dispatch(
            playSound({
              sound,
              duration: Math.floor(howl.duration()),
            })
          );
        });

        howl.on("end", () => {
          if (!sound.repeat) {
            dispatch(stopSound(sound.id));
            soundsRef.current[sound.id]?.stop();
            delete soundsRef.current[sound.id];
          }
        });

        howl.on("loaderror", error);

        howl.on("playerror", error);

        const howlSound = (howl as any)._sounds[0];
        if (!howlSound) {
          error();
        }
      } catch {
        error();
      }
    },
    [onError]
  );

  useEffect(() => {
    // Update playback
    let handler = requestAnimationFrame(animatePlayback);
    let prevTime = performance.now();
    function animatePlayback(time: number) {
      handler = requestAnimationFrame(animatePlayback);
      // Limit update to 1 time per 200 ms
      const delta = time - prevTime;
      if (delta > 200) {
        for (let id in soundsRef.current) {
          const howl = soundsRef.current[id];
          if (howl.playing()) {
            dispatch(updatePlayback({ id, current: howl.seek() }));
          }
        }
        prevTime = time;
      }
    }
    return () => {
      cancelAnimationFrame(handler);
    };
  }, []);

  const seek = useCallback((id: string, to: number) => {
    dispatch(updatePlayback({ id, current: to }));
    soundsRef.current[id]?.seek(to);
  }, []);

  const stop = useCallback((id: string) => {
    dispatch(stopSound(id));
    soundsRef.current[id]?.stop();
    delete soundsRef.current[id];
  }, []);

  return {
    seek,
    play,
    stop,
  };
}
