import React, { useCallback, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import styled from "@mui/material/styles/styled";

import { Player } from "../features/playback/Player";
import { usePlayback } from "../features/playback/usePlayback";
import { Playlists } from "../features/playlists/Playlists";
import { Playlist } from "../features/playlists/Playlist";
import { useSelector } from "react-redux";
import { RootState } from "./store";
import { shuffleArray } from "../common/shuffle";

const WallPaper = styled("div")({
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  background: "linear-gradient(#2D3143 0%, #1e2231 100%)",
  zIndex: -1,
});

type Queue = {
  current: number;
  tracks: string[];
  playlistId: string;
};

export function App() {
  const playlists = useSelector((state: RootState) => state.playlists);

  const selectedPlaylist =
    playlists.selectedPlaylist &&
    playlists.playlists.byId[playlists.selectedPlaylist];

  const [queue, setQueue] = useState<Queue | null>(null);

  function handlePlay(trackId: string, playlistId: string) {
    const playlist = playlists.playlists.byId[playlistId];
    const track = playlists.tracks[trackId];
    if (playlist && track) {
      let tracks = [...playlist.tracks];
      if (shuffle) {
        // Remove track to play, shuffle the rest and insert it back at the start
        const trackIndex = tracks.indexOf(trackId);
        tracks.splice(trackIndex, 1);
        shuffleArray(tracks);
        tracks.unshift(trackId);
      }
      setQueue({ tracks, current: tracks.indexOf(trackId), playlistId });
      play(track.url, track.title);
    }
  }

  function handlePlaybackEnd() {
    if ((repeat === "track" || repeat === "playlist") && queue) {
      let index = queue.current;
      if (repeat === "playlist") {
        index = (index + 1) % queue.tracks.length;
      }
      const id = queue.tracks[index];
      if (id) {
        const track = playlists.tracks[id];
        if (track) {
          play(track.url, track.title);
          setQueue({ ...queue, current: index });
        }
      }
    }
  }

  function handleShuffle(shuffle: boolean) {
    setShuffle(shuffle);
    // If we have a queue shuffle / unshuffle it
    if (queue) {
      if (shuffle) {
        const tracks = [...queue.tracks];
        const trackIndex = queue.current;
        const trackId = tracks[trackIndex];
        if (trackId) {
          tracks.splice(trackIndex, 1);
          shuffleArray(tracks);
          tracks.unshift(trackId);
          setQueue({ ...queue, tracks, current: 0 });
        }
      } else {
        const trackId = queue.tracks[queue.current];
        const playlist = playlists.playlists.byId[queue.playlistId];
        if (playlist && trackId) {
          const tracks = [...playlist.tracks];
          setQueue({
            tracks: tracks,
            current: tracks.indexOf(trackId),
            playlistId: playlist.id,
          });
        }
      }
    }
  }

  function handleNext() {
    if (repeat === "off") {
      setPlaying(false);
      seek(0);
    } else if (repeat === "track") {
      seek(0);
    } else if (repeat === "playlist" && queue) {
      let index = (queue.current + 1) % queue.tracks.length;
      const id = queue.tracks[index];
      if (id) {
        const track = playlists.tracks[id];
        if (track) {
          play(track.url, track.title);
          setQueue({ ...queue, current: index });
        }
      }
    }
  }

  function handlePrevious() {
    if (repeat === "off") {
      setPlaying(false);
      seek(0);
    } else if (repeat === "track") {
      seek(0);
    } else if (repeat === "playlist" && queue) {
      let index = queue.current;
      // Only go to previous if at the start of the track
      if (playback.current < 5) {
        index -= 1;
      }
      if (index < 0) {
        index = queue.tracks.length - 1;
      }
      const id = queue.tracks[index];
      if (id) {
        const track = playlists.tracks[id];
        if (track) {
          play(track.url, track.title);
          setQueue({ ...queue, current: index });
        }
      }
    }
  }

  const {
    playing,
    volume,
    muted,
    shuffle,
    repeat,
    track,
    playback,
    seek,
    setPlaying,
    setVolume,
    setShuffle,
    setRepeat,
    setMuted,
    play,
  } = usePlayback(handlePlaybackEnd);

  return (
    <Box>
      <WallPaper />
      {selectedPlaylist ? (
        <Playlist
          playlist={selectedPlaylist}
          onPlay={(id) => {
            handlePlay(id, selectedPlaylist.id);
          }}
        />
      ) : (
        <Playlists
          onPlay={(playlistId) => {
            const playlist = playlists.playlists.byId[playlistId];
            if (playlist) {
              const trackId = playlist.tracks[0];
              if (trackId) {
                handlePlay(trackId, playlistId);
              }
            }
          }}
        />
      )}
      <Player
        playing={playing}
        volume={volume}
        muted={muted}
        shuffle={shuffle}
        repeat={repeat}
        track={track}
        playback={playback}
        onSeek={seek}
        onPlay={setPlaying}
        onVolumeChange={setVolume}
        onShuffle={handleShuffle}
        onRepeat={setRepeat}
        onMute={setMuted}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </Box>
  );
}
