import React, { useState } from "react";

import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
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
import { Playback, Track } from "./App";

const WallPaper = styled("div")({
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  background: "linear-gradient(#9890e3 0%, #b3adec 100%)",
  "&:before": {
    content: '""',
    width: "140%",
    height: "140%",
    position: "absolute",
    top: "-40%",
    right: "-50%",
    background:
      "radial-gradient(at center center, #b1f4cf 0%, rgba(62, 79, 249, 0) 64%)",
  },
  "&:after": {
    content: '""',
    width: "140%",
    height: "140%",
    position: "absolute",
    bottom: "-50%",
    left: "-30%",
    background:
      "radial-gradient(at center center, #ee99ff 0%, rgba(247, 237, 225, 0) 70%)",
    transform: "rotate(30deg)",
  },
});

const Widget = styled("div")({
  padding: 16,
  borderRadius: 16,
  width: 343,
  maxWidth: "100%",
  margin: "auto",
  position: "relative",
  zIndex: 1,
});

const Overlay = styled("div")({
  backgroundColor: "rgba(0,0,0,0.6)",
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
});

const TimeSlider = styled(Slider)({
  color: "#fff",
  height: 4,
  "& .MuiSlider-thumb": {
    width: 8,
    height: 8,
    transition: "0.3s cubic-bezier(.47,1.64,.41,.8)",
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

type RemotePlayerProps = {
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
}: RemotePlayerProps) {
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

  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      <Widget>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography sx={{ width: "100%" }} textAlign="center" noWrap>
            <b>{track?.title || "Play a track to get started"}</b>
          </Typography>
        </Box>
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: -1,
          }}
        >
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
        </Box>
        <Stack
          spacing={2}
          direction="row"
          sx={{ mb: 1, px: 1 }}
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
          <IconButton
            aria-label={loop ? "no loop" : "loop"}
            onClick={handleLoop}
          >
            {loop ? <RepeatOne /> : <Repeat />}
          </IconButton>
        </Stack>
      </Widget>
      <WallPaper />
      <Overlay />
    </Box>
  );
}
