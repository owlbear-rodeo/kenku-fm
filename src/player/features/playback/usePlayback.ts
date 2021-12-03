import { useCallback, useEffect, useRef } from "react";
import { Howl, Howler } from "howler";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  playPause,
  playTrack,
  updatePlayback,
  updateQueue,
  stopTrack,
} from "./playbackSlice";
import { Track } from "../playlists/playlistsSlice";

export function usePlayback(onError: (message: string) => void) {
  const trackRef = useRef<Howl | null>(null);
  const animationRef = useRef<number | null>(null);

  const playlists = useSelector((state: RootState) => state.playlists);
  const playback = useSelector((state: RootState) => state.playback);
  const dispatch = useDispatch();

  const play = useCallback(
    (track: Track) => {
      const howl = new Howl({
        src: track.url,
        html5: true,
      });

      let prevTrack = trackRef.current;
      const removePrevTrack = () => {
        if (prevTrack) {
          prevTrack.unload();
          prevTrack = undefined;
        }
      };
      const error = () => {
        dispatch(stopTrack());
        removePrevTrack();
        trackRef.current = undefined;
        onError(`Unable to play track: ${track.title}`);
      };
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
          prevTrack.fade(1, 0, 1000);
          prevTrack.once("fade", removePrevTrack);
        }
        howl.fade(0, 1, 1000);
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

      // Update UI based off of native controls
      // TODO: Find a way to do this that doesn't break seeking
      const sound = (howl as any)._sounds[0];
      if (sound) {
        // const node = sound._node;
        // node.onpause = () => {
        // dispatch(playPause(false));
        //   sound._paused = true;
        //   sound._seek = node.currentTime;
        // };
        // node.onplaying = () => {
        // dispatch(playPause(true));
        //   sound._paused = false;
        //   sound._seek = node.currentTime;
        // };
      } else {
        error();
      }

      return () => {
        howl.unload();
      };
    },
    [onError]
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
    if (!playback.playback) {
      return;
    }
    if (playback.repeat === "off") {
      stop();
    } else if (playback.repeat === "track") {
      seek(0);
    } else if (playback.repeat === "playlist" && playback.queue) {
      let index = (playback.queue.current + 1) % playback.queue.tracks.length;
      let id: string;
      if (playback.shuffle) {
        id = playback.queue.tracks[playback.queue.shuffled[index]];
      } else {
        id = playback.queue.tracks[index];
      }
      if (id) {
        if (id === playback.track?.id) {
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
  }, [playback, playlists, seek, play, stop]);

  const previous = useCallback(() => {
    if (!playback.playback) {
      return;
    }
    if (playback.repeat === "off") {
      stop();
    } else if (playback.repeat === "track") {
      seek(0);
    } else if (playback.repeat === "playlist" && playback.queue) {
      let index = playback.queue.current;
      // Only go to previous if at the start of the track
      if (playback.playback.current < 5) {
        index -= 1;
      }
      if (index < 0) {
        index = playback.queue.tracks.length - 1;
      }
      let id: string;
      if (playback.shuffle) {
        id = playback.queue.tracks[playback.queue.shuffled[index]];
      } else {
        id = playback.queue.tracks[index];
      }
      if (id) {
        if (id === playback.track?.id) {
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
  }, [playback, playlists, seek, play, stop]);

  useEffect(() => {
    const track = trackRef.current;
    // Move to next song or repeat this song on track end
    function handleEnd() {
      if (playback.repeat === "track") {
        seek(0);
        track?.play();
      } else if (playback.repeat === "playlist" && playback.queue) {
        const index =
          (playback.queue.current + 1) % playback.queue.tracks.length;
        let id: string;
        if (playback.shuffle) {
          id = playback.queue.tracks[playback.queue.shuffled[index]];
        } else {
          id = playback.queue.tracks[index];
        }
        if (id) {
          if (id === playback.track?.id) {
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
  }, [playback, playlists, play, seek]);

  useEffect(() => {
    if (trackRef.current) {
      if (playback.playing) {
        trackRef.current.play();
      } else {
        trackRef.current.pause();
      }
    }
  }, [playback.playing, playback.track]);

  useEffect(() => {
    if (trackRef.current) {
      if (playback.muted) {
        Howler.mute(true);
      } else {
        Howler.mute(false);
      }
    }
  }, [playback.muted]);

  useEffect(() => {
    Howler.volume(playback.volume);
  }, [playback.volume]);

  return {
    seek,
    play,
    next,
    previous,
    stop,
  };
}
