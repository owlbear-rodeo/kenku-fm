import { useEffect } from "react";
import { v4 as uuid } from "uuid";

import { Track } from "../playlists/playlistsSlice";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  playPause,
  repeat,
  mute,
  adjustVolume,
  shuffle,
  startQueue,
} from "../playback/playbackSlice";

export function useRemote(
  play: (track: Track) => void,
  seek: (to: number) => void,
  next: () => void,
  previous: () => void
) {
  const playlists = useSelector((state: RootState) => state.playlists);
  const playback = useSelector((state: RootState) => state.playback);
  const dispatch = useDispatch();

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAY_URL", (args) => {
      const url = args[0];
      const title = args[1];
      const track = { url, title, id: uuid() };
      dispatch(
        startQueue({
          tracks: [track.id],
          playlistId: "",
          trackId: track.id,
        })
      );
      play(track);
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
      if (playback.playback) {
        dispatch(playPause(true));
      }
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_PAUSE", () => {
      if (playback.playback) {
        dispatch(playPause(false));
      }
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_SEEK", (args) => {
      const to = args[0];
      if (playback.playback) {
      }
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_PLAY");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_PAUSE");
    };
  }, [playback]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYBACK_SEEK", (args) => {
      const to = args[0];
      if (playback.playback) {
        // Clamp playback and seek
        seek(Math.min(Math.max(to, 0), playback.playback.duration));
      }
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_SEEK");
    };
  }, [playback, seek]);

  useEffect(() => {
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
}
