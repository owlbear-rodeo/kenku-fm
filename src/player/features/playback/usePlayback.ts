import { useCallback, useEffect, useRef } from "react";
import { Howl, Howler } from "howler";
import { v4 as uuid } from "uuid";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  toggleMute,
  playPause,
  playTrack,
  repeat,
  updatePlayback,
  increaseVolume,
  decreaseVolume,
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

  useEffect(() => {
    // Move to next song or repeat this song on track end
    function handleEnd() {
      if (
        (playback.repeat === "track" || playback.repeat === "playlist") &&
        playback.queue
      ) {
        let index = playback.queue.current;
        if (playback.repeat === "playlist") {
          index = (index + 1) % playback.queue.tracks.length;
        }
        let id: string;
        if (playback.shuffle) {
          id = playback.queue.tracks[playback.queue.shuffled[index]];
        } else {
          id = playback.queue.tracks[index];
        }
        if (id) {
          const track = playlists.tracks[id];
          if (track) {
            play(track);
            dispatch(updateQueue(index));
          }
        }
      }
    }
    const track = trackRef.current;
    track?.on("end", handleEnd);
    return () => {
      track?.off("end", handleEnd);
    };
  }, [playback, playlists, play]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAY", (args) => {
      const url = args[0];
      const title = args[1];
      const loop = args[2];

      play({ url, title, id: uuid() });
      dispatch(repeat(loop));
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAY");
    };
  }, [play]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYBACK_PLAY_PAUSE", () => {
      if (trackRef.current) {
        if (trackRef.current.playing()) {
          dispatch(playPause(false));
        } else {
          dispatch(playPause(true));
        }
      }
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_MUTE", () => {
      dispatch(toggleMute());
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_INCREASE_VOLUME", () => {
      dispatch(increaseVolume());
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_DECREASE_VOLUME", () => {
      dispatch(decreaseVolume());
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_PLAY_PAUSE");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_MUTE");
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYBACK_INCREASE_VOLUME"
      );
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYBACK_DECREASE_VOLUME"
      );
    };
  }, []);

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

  function seek(to: number) {
    dispatch(updatePlayback(to));
    trackRef.current?.seek(to);
  }

  return {
    seek,
    play,
  };
}
