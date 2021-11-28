import React from "react";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

import { backgrounds, isBackground } from "../../backgrounds";

import { Playlist } from "./playlistsSlice";

type PlaylistItemProps = {
  playlist: Playlist;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
};

export function PlaylistItem({
  playlist,
  onSelect,
  onPlay,
}: PlaylistItemProps) {
  const image = isBackground(playlist.background)
    ? backgrounds[playlist.background]
    : playlist.background;
  return (
    <Card sx={{ position: "relative" }}>
      <CardActionArea onClick={() => onSelect(playlist.id)}>
        <CardMedia
          component="img"
          height="100"
          image={image}
          alt={"Background"}
          sx={{ pointerEvents: "none" }}
        />
      </CardActionArea>
      <Box
        sx={{
          backgroundImage:
            "linear-gradient(0deg, #00000088 30%, #ffffff44 100%)",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          padding: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "absolute",
          bottom: 0,
          width: "100%",
          pointerEvents: "none",
        }}
      >
        <Typography variant="h5" component="div">
          {playlist.title}
        </Typography>
        <IconButton
          aria-label="play/pause"
          sx={{ pointerEvents: "all" }}
          onClick={() => onPlay(playlist.id)}
        >
          <PlayArrowIcon sx={{ fontSize: "2rem" }} />
        </IconButton>
      </Box>
    </Card>
  );
}
