import React from "react";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
import ShuffleIcon from "@mui/icons-material/ShuffleRounded";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

import { backgrounds, isBackground } from "../../backgrounds";

import { Sound, Soundboard } from "./soundboardsSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

type SoundboardItemProps = {
  soundboard: Soundboard;
  onSelect: (id: string) => void;
  onPlay: (sound: Sound) => void;
};

export function SoundboardItem({
  soundboard,
  onSelect,
  onPlay,
}: SoundboardItemProps) {
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const image = isBackground(soundboard.background)
    ? backgrounds[soundboard.background]
    : soundboard.background;

  function handleShuffle() {
    let sounds = [...soundboard.sounds];
    // Play a random sound from the soundboard
    const soundId = sounds[Math.floor(Math.random() * sounds.length)];
    const sound = soundboards.sounds[soundId];
    if (sound) {
      onPlay(sound);
    }
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
          aria-label="shuffle"
          sx={{ pointerEvents: "all" }}
          onClick={handleShuffle}
        >
          <ShuffleIcon sx={{ fontSize: "2rem" }} />
        </IconButton>
      </Box>
    </Card>
  );
}
