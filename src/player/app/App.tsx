import React, { useCallback, useState } from "react";

import styled from "@mui/material/styles/styled";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import { Routes, Route } from "react-router-dom";

import { Player } from "../features/playback/Player";
import { usePlayback } from "../features/playback/usePlayback";
import { useMediaSession } from "../features/playback/useMediaSession";
import { useRemote } from "../features/remote/useRemote";
import { Playlists } from "../features/playlists/Playlists";
import { Playlist } from "../features/playlists/Playlist";

import "../../renderer/app/App.css";
import { Home } from "../features/home/Home";

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

  const { seek, play, next, previous, stop } = usePlayback(handleError);
  useMediaSession(seek, next, previous, stop);
  useRemote(play, seek, next, previous);

  return (
    <>
      <WallPaper />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="playlists" element={<Playlists onPlay={play} />} />
        <Route
          path="playlists/:playlistId"
          element={<Playlist onPlay={play} />}
        />
      </Routes>
      <Player onSeek={seek} onNext={next} onPrevious={previous} />
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
