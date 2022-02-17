import { useEffect } from "react";

import { Track } from "./playlistsSlice";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  playPause,
  repeat,
  mute,
  adjustVolume,
  shuffle,
  startQueue,
} from "./playlistPlaybackSlice";

export function usePlaylistRemote(
  play: (track: Track) => void,
  seek: (to: number) => void,
  next: () => void,
  previous: () => void
) {
  const playlists = useSelector((state: RootState) => state.playlists);
  const playback = useSelector((state: RootState) => state.playlistPlayback);
  const dispatch = useDispatch();

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAY", (args) => {
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
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_PLAY");
    };
  }, [play, playlists]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST", () => {
      let track = undefined;
      if (playback.track && playback.playback && playback.queue) {
        track = {
          ...playback.track,
          ...playback.playback,
        };
      }
      let playlist = undefined;
      if (playback.queue?.playlistId) {
        playlist = {
          id: playback.queue.playlistId,
          title: playlists.playlists.byId[playback.queue.playlistId]?.title,
        };
      }
      window.player.playlistPlaybackReply({
        playing: playback.playing,
        volume: playback.volume,
        muted: playback.muted,
        shuffle: playback.shuffle,
        repeat: playback.repeat,
        track,
        playlist,
      });
    });

    return () => {
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST"
      );
    };
  }, [playback]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY", () => {
      if (playback.playback) {
        dispatch(playPause(true));
      }
    });

    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE", () => {
      if (playback.playback) {
        dispatch(playPause(false));
      }
    });

    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK", (args) => {
      const to = args[0];
      if (playback.playback) {
      }
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE");
    };
  }, [playback]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK", (args) => {
      const to = args[0];
      if (playback.playback) {
        // Clamp playback and seek
        seek(Math.min(Math.max(to, 0), playback.playback.duration));
      }
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK");
    };
  }, [playback, seek]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE", (args) => {
      const muted = args[0];
      dispatch(mute(muted));
    });

    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME", (args) => {
      const volume = args[0];
      dispatch(adjustVolume(volume));
    });

    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE", (args) => {
      const shuffled = args[0];
      dispatch(shuffle(shuffled));
    });

    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT", (args) => {
      const repeated = args[0];
      dispatch(repeat(repeated));
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE");
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME"
      );
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE"
      );
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT"
      );
    };
  }, []);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT", () => {
      next();
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT");
    };
  }, [next]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS", () => {
      previous();
    });

    return () => {
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS"
      );
    };
  }, [previous]);
}
