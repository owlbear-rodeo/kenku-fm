import { useCallback, useEffect, useRef } from "react";
import { Howl, Howler } from "howler";
import { v4 as uuid } from "uuid";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  playPause,
  playTrack,
  repeat,
  updatePlayback,
  updateQueue,
  stopTrack,
  mute,
  adjustVolume,
  shuffle,
  startQueue,
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

  const next = useCallback(() => {
    if (!playback.playback) {
      return;
    }
    if (playback.repeat === "off") {
      dispatch(playPause(false));
      seek(0);
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
        const track = playlists.tracks[id];
        if (track) {
          play(track);
          dispatch(updateQueue(index));
        }
      }
    }
  }, [playback, playlists, seek, play]);

  const previous = useCallback(() => {
    if (!playback.playback) {
      return;
    }
    if (playback.repeat === "off") {
      dispatch(playPause(false));
      seek(0);
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
        const track = playlists.tracks[id];
        if (track) {
          play(track);
          dispatch(updateQueue(index));
        }
      }
    }
  }, [playback, playlists, seek, play]);

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
    window.player.on("PLAYER_REMOTE_PLAY_URL", (args) => {
      const url = args[0];
      const title = args[1];
      const track = { url, title, id: uuid() };
      play(track);
      dispatch(
        startQueue({
          tracks: [track.id],
          playlistId: "",
          trackId: track.id,
        })
      );
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAY_URL");
    };
  }, [play]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAY_ID", (args) => {
      const id = args[0];
      if (id in playlists.tracks) {
        const track = playlists.tracks[id];
        // Find playlist assosiated with this track and start a queue
        for (let playlist of Object.values(playlists.playlists.byId)) {
          const tracks = [...playlist.tracks];
          if (tracks.includes(track.id)) {
            dispatch(
              startQueue({ tracks, trackId: track.id, playlistId: playlist.id })
            );
            break;
          }
        }
        play(track);
      } else if (id in playlists.playlists.byId) {
        const playlist = playlists.playlists.byId[id];
        const tracks = [...playlist.tracks];
        const trackId = tracks[0];
        const track = playlists.tracks[trackId];
        if (track) {
          play(track);
          dispatch(startQueue({ tracks, trackId, playlistId: playlist.id }));
        }
      }
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAY_ID");
    };
  }, [play, playlists]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYBACK_REQUEST", () => {
      window.player.playbackReply({
        playing: playback.playing,
        volume: playback.volume,
        muted: playback.muted,
        shuffle: playback.shuffle,
        repeat: playback.repeat,
        track:
          playback.track && playback.playback && playback.queue
            ? {
                ...playback.track,
                duration: playback.playback.duration,
                playlist: playback.queue.playlistId
                  ? {
                      id: playback.queue.playlistId,
                      title:
                        playlists.playlists.byId[playback.queue.playlistId]
                          ?.title,
                    }
                  : undefined,
              }
            : undefined,
        progress: playback.playback?.current,
      });
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_REQUEST");
    };
  }, [playback]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYBACK_PLAY", () => {
      if (trackRef.current) {
        dispatch(playPause(true));
      }
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_PAUSE", () => {
      if (trackRef.current) {
        dispatch(playPause(false));
      }
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_MUTE", (args) => {
      const muted = args[0];
      dispatch(mute(muted));
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_VOLUME", (args) => {
      const volume = args[0];
      dispatch(adjustVolume(volume));
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_SHUFFLE", (args) => {
      const shuffled = args[0];
      dispatch(shuffle(shuffled));
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_REPEAT", (args) => {
      const repeated = args[0];
      dispatch(repeat(repeated));
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_PLAY");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_PAUSE");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_MUTE");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_VOLUME");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_SHUFFLE");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_REPEAT");
    };
  }, []);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYBACK_NEXT", () => {
      next();
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_NEXT");
    };
  }, [next]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYBACK_PREVIOUS", () => {
      previous();
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_PREVIOUS");
    };
  }, [previous]);

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
  };
}
