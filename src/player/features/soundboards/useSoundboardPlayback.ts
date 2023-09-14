import { useCallback, useEffect, useRef, useState } from "react";

import { useDispatch } from "react-redux";
import {
  playSound,
  updatePlayback,
  stopSound,
} from "./soundboardPlaybackSlice";
import { Sound as SoundType } from "./soundboardsSlice";
import { Sound } from "./Sound";

export function useSoundboardPlayback(onError: (message: string) => void) {
  const soundsRef = useRef<Record<string, Sound>>({});
  const [playing, setPlaying] = useState(false);
  const dispatch = useDispatch();

  const updatePlaying = useCallback(() => {
    setPlaying(Object.keys(soundsRef.current).length > 0);
  }, []);

  const play = useCallback(
    (sound: SoundType) => {
      if (soundsRef.current[sound.id]) {
        soundsRef.current[sound.id].stop(false);
        delete soundsRef.current[sound.id];
        updatePlaying();
      }

      const playback = new Sound({
        src: sound.url,
        volume: sound.volume,
        fadeIn: sound.fadeIn,
        fadeOut: sound.fadeOut,
        loop: sound.loop,
      });

      playback.once("load", (duration) => {
        dispatch(
          playSound({
            sound,
            duration: Math.floor(duration),
          })
        );
      });

      playback.on("end", () => {
        dispatch(stopSound(sound.id));
        soundsRef.current[sound.id]?.stop(false);
        delete soundsRef.current[sound.id];
        updatePlaying();
      });

      playback.on("error", () => {
        delete soundsRef.current[sound.id];
        dispatch(stopSound(sound.id));
        onError(`Unable to play sound: ${sound.title}`);
        updatePlaying();
      });

      soundsRef.current[sound.id] = playback;
      updatePlaying();
    },
    [onError]
  );

  useEffect(() => {
    if (!playing) {
      return;
    }
    // Update playback
    let handler = requestAnimationFrame(animatePlayback);
    let prevTime = performance.now();
    function animatePlayback(time: number) {
      handler = requestAnimationFrame(animatePlayback);
      // Limit update to 1 time per second
      const delta = time - prevTime;
      if (delta > 1000) {
        const updates: { id: string; progress: number }[] = [];
        for (let id in soundsRef.current) {
          const sound = soundsRef.current[id];
          if (sound.playing()) {
            updates.push({ id, progress: sound.progress() });
          }
        }
        if (updates.length > 0) {
          dispatch(updatePlayback(updates));
        }
        prevTime = time;
      }
    }
    return () => {
      cancelAnimationFrame(handler);
    };
  }, [playing]);

  const seek = useCallback((id: string, to: number) => {
    dispatch(updatePlayback([{ id, progress: to }]));
    soundsRef.current[id]?.seek(to);
  }, []);

  const stop = useCallback(async (id: string) => {
    dispatch(stopSound(id));
    const loop = soundsRef.current[id];
    if (loop) {
      await loop.stop(true);
      delete soundsRef.current[id];
      updatePlaying();
    }
  }, []);

  // Sync function for updating the currently playing sounds with the redux store
  // Used in `SoundboardPlaybackSync`
  const sync = useCallback((update: (id: string, sound: Sound) => void) => {
    for (let [id, sound] of Object.entries(soundsRef.current)) {
      update(id, sound);
    }
  }, []);

  return {
    seek,
    play,
    stop,
    sync,
  };
}
