import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  playPause,
  playTrack,
  updatePlayback,
  updateQueue,
  stopTrack,
} from "./playlistPlaybackSlice";
import { Track } from "./playlistsSlice";
import { useStore } from "react-redux";

export function usePlaylistPlayback(onError: (message: string) => void) {
  const trackRef = useRef<Howl | null>(null);
  const animationRef = useRef<number | null>(null);

  const playlists = useSelector((state: RootState) => state.playlists);
  const store = useStore<RootState>();
  const muted = useSelector((state: RootState) => state.playlistPlayback.muted);
  const repeat = useSelector(
    (state: RootState) => state.playlistPlayback.repeat
  );
  const shuffle = useSelector(
    (state: RootState) => state.playlistPlayback.shuffle
  );
  const queue = useSelector((state: RootState) => state.playlistPlayback.queue);
  const playbackTrack = useSelector(
    (state: RootState) => state.playlistPlayback.track
  );
  const dispatch = useDispatch();

  const play = useCallback(
    (track: Track) => {
      let prevTrack = trackRef.current;
      function removePrevTrack() {
        if (prevTrack) {
          prevTrack.unload();
          prevTrack = undefined;
        }
      }
      function error() {
        trackRef.current = undefined;
        dispatch(stopTrack());
        removePrevTrack();
        onError(`Unable to play track: ${track.title}`);
      }

      try {
        const howl = new Howl({
          src: track.url,
          html5: true,
          mute: muted,
          volume: 0,
        });

        trackRef.current = howl;
        howl.once("load", () => {
          dispatch(
            playTrack({
              track,
              duration: Math.floor(howl.duration()),
            })
          );
          // Fade out previous track and fade in new track
          if (prevTrack) {
            prevTrack.fade(prevTrack.volume(), 0, 1000);
            prevTrack.once("fade", removePrevTrack);
          }
          howl.fade(0, store.getState().playlistPlayback.volume, 1000);
          // Update playback
          // Create playback animation
          if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current);
          }
          let prevTime = performance.now();
          function animatePlayback(time: number) {
            animationRef.current = requestAnimationFrame(animatePlayback);
            // Limit update to 1 time per second
            const delta = time - prevTime;
            if (howl.playing() && delta > 1000) {
              dispatch(updatePlayback(Math.floor(howl.seek())));
              prevTime = time;
            }
          }
          animationRef.current = requestAnimationFrame(animatePlayback);
        });

        howl.on("loaderror", error);

        howl.on("playerror", error);

        const sound = (howl as any)._sounds[0];
        if (!sound) {
          error();
        }
      } catch {
        error();
      }
    },
    [onError, muted, store]
  );

  const seek = useCallback((to: number) => {
    dispatch(updatePlayback(to));
    trackRef.current?.seek(to);
  }, []);

  const stop = useCallback(() => {
    dispatch(playPause(false));
    dispatch(updatePlayback(0));
    trackRef.current?.stop();
  }, []);

  const next = useCallback(() => {
    if (!trackRef.current) {
      return;
    }
    if (!queue) {
      stop();
    } else if (repeat === "track") {
      seek(0);
    } else {
      let index = queue.current + 1;

      if (index >= queue.tracks.length) {
        // Repeat off just stop the playback
        if (repeat === "off") {
          stop();
          return;
        }
        index = 0;
      }

      let id: string;
      if (shuffle) {
        id = queue.tracks[queue.shuffled[index]];
      } else {
        id = queue.tracks[index];
      }
      if (id) {
        if (id === playbackTrack?.id) {
          // Playing the same track just restart it
          seek(0);
        } else {
          // Play the previous track
          const previousTrack = playlists.tracks[id];
          if (previousTrack) {
            play(previousTrack);
            dispatch(updateQueue(index));
          }
        }
      }
    }
  }, [repeat, queue, shuffle, playbackTrack, playlists, seek, play, stop]);

  const previous = useCallback(() => {
    if (!trackRef.current) {
      return;
    }
    if (!queue) {
      stop();
    } else if (repeat === "track") {
      seek(0);
    } else {
      let index = queue.current;
      // Only go to previous if at the start of the track
      if (trackRef.current.seek() < 5) {
        index -= 1;
      }
      if (index < 0) {
        // Start of playlist with repeat off just stop the track
        if (repeat === "off") {
          stop();
          return;
        }
        index = queue.tracks.length - 1;
      }
      let id: string;
      if (shuffle) {
        id = queue.tracks[queue.shuffled[index]];
      } else {
        id = queue.tracks[index];
      }
      if (id) {
        if (id === playbackTrack?.id) {
          // Playing the same track just restart it
          seek(0);
        } else {
          // Play the next track
          const nextTrack = playlists.tracks[id];
          if (nextTrack) {
            play(nextTrack);
            dispatch(updateQueue(index));
          }
        }
      }
    }
  }, [repeat, queue, shuffle, playbackTrack, playlists, seek, play, stop]);

  useEffect(() => {
    const track = trackRef.current;
    // Move to next song or repeat this song on track end
    function handleEnd() {
      if (!queue) {
        stop();
      } else if (repeat === "track") {
        seek(0);
        track?.play();
      } else {
        let index = queue.current + 1;
        if (index >= queue.tracks.length) {
          // Repeat off just stop the playback
          if (repeat === "off") {
            stop();
            return;
          }
          index = 0;
        }
        let id: string;
        if (shuffle) {
          id = queue.tracks[queue.shuffled[index]];
        } else {
          id = queue.tracks[index];
        }
        if (id) {
          if (id === playbackTrack?.id) {
            // Playing the same track just restart it
            seek(0);
            track?.play();
          } else {
            // Play the next track
            const nextTrack = playlists.tracks[id];
            if (nextTrack) {
              play(nextTrack);
              dispatch(updateQueue(index));
            }
          }
        }
      }
    }
    track?.on("end", handleEnd);
    return () => {
      track?.off("end", handleEnd);
    };
  }, [repeat, queue, shuffle, playbackTrack, playlists, play, seek, stop]);

  const pauseResume = useCallback((resume: boolean) => {
    if (trackRef.current) {
      if (resume) {
        trackRef.current.play();
      } else {
        trackRef.current.pause();
      }
    }
  }, []);

  const mute = useCallback((muted: boolean) => {
    if (trackRef.current) {
      trackRef.current.mute(muted);
    }
  }, []);

  const volume = useCallback((volume: number) => {
    if (trackRef.current) {
      trackRef.current.volume(volume);
    }
  }, []);

  return {
    seek,
    play,
    next,
    previous,
    stop,
    pauseResume,
    mute,
    volume,
  };
}
