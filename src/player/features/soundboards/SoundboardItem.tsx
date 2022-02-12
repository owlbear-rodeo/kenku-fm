import React from "react";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import PauseIcon from "@mui/icons-material/PauseRounded";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

import { backgrounds, isBackground } from "../../backgrounds";

import { Soundboard } from "./soundboardsSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { playPause } from "../playback/playbackSlice";

type SoundboardItemProps = {
  soundboard: Soundboard;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
};

export function SoundboardItem({
  soundboard,
  onSelect,
  onPlay,
}: SoundboardItemProps) {
  const playback = useSelector((state: RootState) => state.playback);
  const dispatch = useDispatch();

  const image = isBackground(soundboard.background)
    ? backgrounds[soundboard.background]
    : soundboard.background;

  // TODO
  const playing =
    playback.playing && playback.queue?.playlistId === soundboard.id;

  function handlePlay() {
    // TODO
    // if (playback.queue?.playlistId === soundboard.id) {
    //   dispatch(playPause(!playback.playing));
    // } else {
    onPlay(soundboard.id);
    // }
  }

  return (
    <Card sx={{ position: "relative" }}>
      <CardActionArea onClick={() => onSelect(soundboard.id)}>
        <CardMedia
          component="img"
          height="200px"
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
          {soundboard.title}
        </Typography>
        <IconButton
          aria-label="play/pause"
          sx={{ pointerEvents: "all" }}
          onClick={handlePlay}
        >
          {playing ? (
            <PauseIcon sx={{ fontSize: "2rem" }} />
          ) : (
            <PlayArrowIcon sx={{ fontSize: "2rem" }} />
          )}
        </IconButton>
      </Box>
    </Card>
  );
}
