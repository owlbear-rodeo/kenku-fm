import React, { useState } from "react";

import styled from "@mui/material/styles/styled";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Pause from "@mui/icons-material/PauseRounded";
import PlayArrow from "@mui/icons-material/PlayArrowRounded";
import VolumeDown from "@mui/icons-material/VolumeDownRounded";
import VolumeOff from "@mui/icons-material/VolumeOffRounded";
import Repeat from "@mui/icons-material/RepeatRounded";
import RepeatOne from "@mui/icons-material/RepeatOneRounded";
import Shuffle from "@mui/icons-material/ShuffleRounded";
import Next from "@mui/icons-material/SkipNextRounded";
import Previous from "@mui/icons-material/SkipPreviousRounded";
import Container from "@mui/material/Container";

import { Playback, Track } from "./usePlayback";

const TimeSlider = styled(Slider)({
  color: "#fff",
  height: 4,
  "& .MuiSlider-thumb": {
    width: 8,
    height: 8,
    "&:before": {
      boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)",
    },
    "&:hover, &.Mui-focusVisible": {
      boxShadow: "0px 0px 0px 8px rgb(255 255 255 / 16%)",
    },
    "&.Mui-active": {
      width: 20,
      height: 20,
    },
  },
  "& .MuiSlider-rail": {
    opacity: 0.28,
  },
});

const VolumeSlider = styled(Slider)({
  color: "#fff",
  "& .MuiSlider-track": {
    border: "none",
  },
  "& .MuiSlider-thumb": {
    width: 24,
    height: 24,
    backgroundColor: "#fff",
    "&:hover, &.Mui-focusVisible, &.Mui-active": {
      boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
    },
  },
});

const TinyText = styled(Typography)({
  fontSize: "0.75rem",
  opacity: 0.38,
  fontWeight: 500,
  letterSpacing: 0.2,
});

type PlayerProps = {
  playing: boolean;
  volume: number;
  muted: boolean;
  loop: boolean;
  track: Track | null;
  playback: Playback | null;
  onSeek?: (to: number) => void;
  onPlay?: (play: boolean) => void;
  onVolumeChange?: (value: number) => void;
  onLoop?: (loop: boolean) => void;
  onMute?: (mute: boolean) => void;
};

export function Player({
  playing,
  volume,
  muted,
  loop,
  track,
  playback,
  onSeek,
  onPlay,
  onVolumeChange,
  onLoop,
  onMute,
}: PlayerProps) {
  function formatDuration(value: number) {
    const minute = Math.floor(value / 60);
    const secondLeft = value - minute * 60;
    return `${minute}:${secondLeft < 10 ? `0${secondLeft}` : secondLeft}`;
  }

  // Override the time slider when changing the value
  const [timeOverride, setTimeOverride] = useState<number | null>(null);
  // Commit the time value when letting go of the slider
  function handleTimeChange(_: Event, value: number | number[]) {
    setTimeOverride(null);
    onSeek?.(value as number);
  }

  function handleVolumeChange(_: Event, value: number | number[]) {
    if (muted && value > 0) {
      onMute(false);
    }
    onVolumeChange?.(value as number);
  }

  function handlePlay() {
    onPlay?.(!playing);
  }

  function handleLoop() {
    onLoop?.(!loop);
  }

  function handleMute() {
    onMute?.(!muted);
  }

  const time = timeOverride === null ? playback?.current || 0 : timeOverride;
  const duration = playback?.duration || 0;

  const noTrack = track?.title === undefined;

  return (
    <Container
      sx={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
      }}
      maxWidth="md"
    >
      <Paper
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Stack direction="row">
          <Box sx={{ display: "flex", alignItems: "center", width: "30%" }}>
            <Typography
              variant="caption"
              sx={{ width: "100%" }}
              textAlign="center"
              noWrap
            >
              {noTrack ? "" : track.title}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mt: -1,
              flexGrow: 1,
            }}
          >
            <IconButton aria-label="shuffle">
              <Shuffle />
            </IconButton>
            <IconButton disabled={!Boolean(playback)} aria-label="previous">
              <Previous />
            </IconButton>
            <IconButton
              aria-label={playing ? "pause" : "play"}
              onClick={handlePlay}
              disabled={!Boolean(playback)}
            >
              {playing ? (
                <Pause sx={{ fontSize: "3rem" }} />
              ) : (
                <PlayArrow sx={{ fontSize: "3rem" }} />
              )}
            </IconButton>
            <IconButton disabled={!Boolean(playback)} aria-label="next">
              <Next />
            </IconButton>
            <IconButton
              aria-label={loop ? "no loop" : "loop"}
              onClick={handleLoop}
            >
              {loop ? <RepeatOne /> : <Repeat />}
            </IconButton>
          </Box>
          <Stack
            spacing={2}
            direction="row"
            sx={{ mb: 1, px: 1, width: "30%" }}
            alignItems="center"
          >
            <IconButton
              aria-label={muted ? "unmute" : "mute"}
              onClick={handleMute}
            >
              {muted ? <VolumeOff /> : <VolumeDown />}
            </IconButton>
            <VolumeSlider
              aria-label="Volume"
              value={muted ? 0 : volume}
              step={0.01}
              min={0}
              max={1}
              onChange={handleVolumeChange}
            />
          </Stack>
        </Stack>
        <Box>
          <TimeSlider
            aria-label="time-indicator"
            size="small"
            value={time}
            min={0}
            step={1}
            max={duration}
            disabled={!Boolean(playback)}
            onChange={(_, value) => setTimeOverride(value as number)}
            onChangeCommitted={handleTimeChange}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: -2,
            }}
          >
            <TinyText>{formatDuration(time)}</TinyText>
            <TinyText>-{formatDuration(duration - time)}</TinyText>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
