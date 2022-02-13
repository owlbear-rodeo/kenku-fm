import React, { useCallback, useState } from "react";

import styled from "@mui/material/styles/styled";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import { Routes, Route } from "react-router-dom";

import { Player } from "../features/player/Player";
import { usePlaylistPlayback } from "../features/playlists/usePlaylistPlayback";
import { useMediaSession } from "../features/playlists/useMediaSession";
import { useRemote } from "../features/remote/useRemote";
import { Playlists } from "../features/playlists/Playlists";
import { Playlist } from "../features/playlists/Playlist";

import "../../renderer/app/App.css";
import { Home } from "../features/home/Home";
import { Soundboards } from "../features/soundboards/Soundboards";
import { Soundboard } from "../features/soundboards/Soundboard";
import { useSoundboardPlayback } from "../features/soundboards/useSoundboardPlayback";

const WallPaper = styled("div")({
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  background: "#222639",
  zIndex: -1,
});

export function App() {
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const playlist = usePlaylistPlayback(handleError);
  useMediaSession(
    playlist.seek,
    playlist.next,
    playlist.previous,
    playlist.stop
  );
  useRemote(playlist.play, playlist.seek, playlist.next, playlist.previous);
  const soundboard = useSoundboardPlayback(handleError);

  return (
    <>
      <WallPaper />
      <Routes>
        <Route path="/" element={<Home />} />
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
