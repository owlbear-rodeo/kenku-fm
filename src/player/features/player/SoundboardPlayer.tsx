import React from "react";

import styled from "@mui/material/styles/styled";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { stopSound } from "../soundboards/soundboardPlaybackSlice";

const SoundProgress = styled(LinearProgress)({
  height: 32,
  borderRadius: 16,
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  "& .MuiLinearProgress-bar": {
    transition: "transform 1s linear",
  },
});

type SoundboardPlayerProps = {
  onSoundboardStop: (id: string) => void;
};

export function SoundboardPlayer({ onSoundboardStop }: SoundboardPlayerProps) {
  const dispatch = useDispatch();
  const soundboardPlayback = useSelector(
    (state: RootState) => state.soundboardPlayback
  );

  function handleSoundboardStop(id: string) {
    dispatch(stopSound(id));
    onSoundboardStop(id);
  }

  const sounds = Object.values(soundboardPlayback.playback);

  if (sounds.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" gap={1} pb={1} overflow="auto">
      {sounds.map((sound) => (
        <Box sx={{ position: "relative" }} key={sound.id}>
          <SoundProgress
            variant="determinate"
            value={Math.min((sound.progress / sound.duration) * 100, 100)}
          />
          <Chip
            label={sound.title}
            onDelete={() => handleSoundboardStop(sound.id)}
          />
        </Box>
      ))}
    </Stack>
  );
}
