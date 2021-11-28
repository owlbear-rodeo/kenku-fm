import React from "react";

import Box from "@mui/material/Box";
import styled from "@mui/material/styles/styled";

import { Player } from "../features/playback/Player";
import { usePlayback } from "../features/playback/usePlayback";
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
  const playlists = useSelector((state: RootState) => state.playlists);

  const selectedPlaylist =
    playlists.selectedPlaylist &&
    playlists.playlists.byId[playlists.selectedPlaylist];

  const { seek, play } = usePlayback();

  return (
    <Box>
      <WallPaper />
      {selectedPlaylist ? (
        <Playlist playlist={selectedPlaylist} onPlay={play} />
      ) : (
        <Playlists onPlay={play} />
      )}
      <Player onSeek={seek} onPlay={play} />
    </Box>
  );
}
