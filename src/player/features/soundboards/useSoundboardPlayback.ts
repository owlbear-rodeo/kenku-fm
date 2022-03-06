import { useCallback, useEffect, useRef } from "react";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  playSound,
  updatePlayback,
  stopSound,
} from "./soundboardPlaybackSlice";
import { Sound } from "./soundboardsSlice";
import { Loop } from "../../common/Loop";

export function useSoundboardPlayback(onError: (message: string) => void) {
  const loopsRef = useRef<Record<string, Loop>>({});
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const dispatch = useDispatch();

  const play = useCallback(
    (sound: Sound) => {
      if (loopsRef.current[sound.id]) {
        loopsRef.current[sound.id].stop(false);
        delete loopsRef.current[sound.id];
      }

      const loop = new Loop({
        src: sound.url,
        volume: sound.volume,
        fadeIn: sound.fadeIn,
        fadeOut: sound.fadeOut,
        loop: sound.loop,
      });

      loop.once("load", (duration) => {
        dispatch(
          playSound({
            sound,
            duration: Math.floor(duration),
          })
        );
      });

      loop.on("end", () => {
        if (!sound.loop) {
          dispatch(stopSound(sound.id));
          loopsRef.current[sound.id]?.stop(false);
          delete loopsRef.current[sound.id];
        }
      });

      loop.on("error", () => {
        delete loopsRef.current[sound.id];
        dispatch(stopSound(sound.id));
        onError(`Unable to play sound: ${sound.title}`);
      });

      loopsRef.current[sound.id] = loop;
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
        for (let id in loopsRef.current) {
          const loop = loopsRef.current[id];
          if (loop.playing()) {
            dispatch(updatePlayback({ id, progress: loop.progress() }));
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
    loopsRef.current[id]?.seek(to);
  }, []);

  const stop = useCallback(
    async (id: string) => {
      dispatch(stopSound(id));
      const loop = loopsRef.current[id];
      if (loop) {
        await loop.stop(true);
        delete loopsRef.current[id];
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
