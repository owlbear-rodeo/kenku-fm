import React, { useCallback, useState } from "react";

import styled from "@mui/material/styles/styled";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import { Routes, Route } from "react-router-dom";

import { Player } from "../features/player/Player";
import { usePlaylistPlayback } from "../features/playlists/usePlaylistPlayback";
import { PlaylistMediaSession } from "../features/playlists/PlaylistMediaSession";
import { PlaylistRemote } from "../features/playlists/PlaylistRemote";
import { PlaylistPlaybackSync } from "../features/playlists/PlaylistPlaybackSync";
import { Playlists } from "../features/playlists/Playlists";
import { Playlist } from "../features/playlists/Playlist";

import "../../renderer/app/App.css";
import { Home } from "../features/home/Home";
import { Soundboards } from "../features/soundboards/Soundboards";
import { Soundboard } from "../features/soundboards/Soundboard";
import { useSoundboardPlayback } from "../features/soundboards/useSoundboardPlayback";
import { SoundboardRemote } from "../features/soundboards/SoundboardRemote";
import { SoundboardPlaybackSync } from "../features/soundboards/SoundboardPlaybackSync";

const WallPaper = styled("div")({
  position: "fixed",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  background: "linear-gradient(#1e2231 0%, #181a25 100%)",
  zIndex: -1,
});

export function App() {
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const playlist = usePlaylistPlayback(handleError);
  const soundboard = useSoundboardPlayback(handleError);

  return (
    <>
      <WallPaper />
      <Routes>
        <Route
          path="/"
          element={
            <Home onPlayTrack={playlist.play} onPlaySound={soundboard.play} />
          }
        />
        <Route
          path="playlists"
          element={<Playlists onPlay={playlist.play} />}
        />
        <Route
          path="playlists/:playlistId"
          element={<Playlist onPlay={playlist.play} />}
        />
        <Route
          path="soundboards"
          element={<Soundboards onPlay={soundboard.play} />}
        />
        <Route
          path="soundboards/:soundboardId"
          element={
            <Soundboard onPlay={soundboard.play} onStop={soundboard.stop} />
          }
        />
      </Routes>
      <Player
        onPlaylistSeek={playlist.seek}
        onPlaylistNext={playlist.next}
        onPlaylistPrevious={playlist.previous}
        onSoundboardStop={soundboard.stop}
      />
      <PlaylistMediaSession
        onSeek={playlist.seek}
        onNext={playlist.next}
        onPrevious={playlist.previous}
        onStop={playlist.stop}
      />
      <PlaylistRemote
        onPlay={playlist.play}
        onSeek={playlist.seek}
        onNext={playlist.next}
        onPrevious={playlist.previous}
      />
      <PlaylistPlaybackSync
        onMute={playlist.mute}
        onPauseResume={playlist.pauseResume}
        onVolume={playlist.volume}
      />
      <SoundboardRemote onPlay={soundboard.play} onStop={soundboard.stop} />
      <SoundboardPlaybackSync onSync={soundboard.sync} />
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={4000}
        onClose={() => setErrorMessage(undefined)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error">{errorMessage}</Alert>
      </Snackbar>
    </>
  );
}
