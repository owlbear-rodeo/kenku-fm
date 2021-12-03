import React, { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import styled from "@mui/material/styles/styled";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import { Player } from "../features/playback/Player";
import { usePlayback } from "../features/playback/usePlayback";
import { useRemote } from "../features/remote/useRemote";
import { Playlists } from "../features/playlists/Playlists";
import { Playlist } from "../features/playlists/Playlist";
import { useSelector } from "react-redux";
import { RootState } from "./store";

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

export function App() {
  const [errorMessage, setErrorMessage] = useState<string>();
  const playlists = useSelector((state: RootState) => state.playlists);

  const selectedPlaylist =
    playlists.selectedPlaylist &&
    playlists.playlists.byId[playlists.selectedPlaylist];

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const { seek, play, next, previous } = usePlayback(handleError);
  useRemote(play, seek, next, previous);

  return (
    <Box>
      <WallPaper />
      {selectedPlaylist ? (
        <Playlist playlist={selectedPlaylist} onPlay={play} />
      ) : (
        <Playlists onPlay={play} />
      )}
      <Player onSeek={seek} onNext={next} onPrevious={previous} />
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={4000}
        onClose={() => setErrorMessage(undefined)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error">{errorMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
