import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  playSound,
  updatePlayback,
  stopSound,
} from "./soundboardPlaybackSlice";
import { Sound } from "./soundboardsSlice";

export function useSoundboardPlayback(onError: (message: string) => void) {
  const soundsRef = useRef<Record<string, Howl>>({});
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const dispatch = useDispatch();

  const play = useCallback(
    (sound: Sound) => {
      function error() {
        delete soundsRef.current[sound.id];
        dispatch(stopSound(sound.id));
        onError(`Unable to play sound: ${sound.title}`);
      }

      if (soundsRef.current[sound.id]) {
        soundsRef.current[sound.id].stop();
        delete soundsRef.current[sound.id];
      }

      try {
        const createHowlerInstance = () => {
          const howl = new Howl({
            src: sound.url,
            html5: true,
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
                if (sound.loop) {
                  // Cross fade on loop
                  howl.fade(sound.volume, 0, sound.fadeOut);
                  howl.once("fade", () => {
                    howl.stop();
                  });
                  createHowlerInstance();
                } else {
                  // Basic fade out when not looping
                  howl.fade(sound.volume, 0, sound.fadeOut);
                }
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
            if (!sound.loop) {
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
        };
        createHowlerInstance();
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
            dispatch(updatePlayback({ id, progress: howl.seek() }));
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
    dispatch(updatePlayback({ id, progress: to }));
    soundsRef.current[id]?.seek(to);
  }, []);

  const stop = useCallback(
    (id: string) => {
      dispatch(stopSound(id));
      const howl = soundsRef.current[id];
      const sound = soundboards.sounds[id];
      // Fade out sound when stopping
      if (howl && sound) {
        howl.fade(howl.volume(), 0, sound.fadeOut);
        howl.once("fade", () => {
          howl.stop();
          delete soundsRef.current[id];
        });
      } else if (howl) {
        // If the user has deleted the sound just stop the howler instance
        howl.stop();
        delete soundsRef.current[id];
      }
    },
    [soundboards]
  );

  return {
    seek,
    play,
    stop,
  };
}
