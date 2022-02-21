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
import VolumeUp from "@mui/icons-material/VolumeUp";
import RepeatIcon from "@mui/icons-material/RepeatRounded";
import RepeatOne from "@mui/icons-material/RepeatOneRounded";
import Shuffle from "@mui/icons-material/ShuffleRounded";
import Next from "@mui/icons-material/SkipNextRounded";
import Previous from "@mui/icons-material/SkipPreviousRounded";
import Container from "@mui/material/Container";
import useMediaQuery from "@mui/material/useMediaQuery";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  adjustVolume,
  playPause,
  mute,
  shuffle,
  repeat,
} from "../playlists/playlistPlaybackSlice";
import { stopSound } from "../soundboards/soundboardPlaybackSlice";

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

const SoundProgress = styled(LinearProgress)({
  height: 32,
  borderRadius: 16,
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  "& .MuiLinearProgress-bar": {
    transition: "transform 200ms linear",
  },
});

type PlayerProps = {
  onPlaylistNext: () => void;
  onPlaylistPrevious: () => void;
  onPlaylistSeek: (to: number) => void;
  onSoundboardStop: (id: string) => void;
};

export function Player({
  onPlaylistNext,
  onPlaylistPrevious,
  onPlaylistSeek,
  onSoundboardStop,
}: PlayerProps) {
  const dispatch = useDispatch();
  const playlists = useSelector((state: RootState) => state.playlists);
  const playlistPlayback = useSelector(
    (state: RootState) => state.playlistPlayback
  );
  const soundboardPlayback = useSelector(
    (state: RootState) => state.soundboardPlayback
  );

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
    onPlaylistSeek(value as number);
  }

  function handleVolumeChange(_: Event, value: number | number[]) {
    if (playlistPlayback.muted && value > 0) {
      dispatch(mute());
    }
    dispatch(adjustVolume(value as number));
  }

  function handlePlay() {
    dispatch(playPause(!playlistPlayback.playing));
  }

  function handlRepeat() {
    switch (playlistPlayback.repeat) {
      case "off":
        dispatch(repeat("playlist"));
        break;
      case "playlist":
        dispatch(repeat("track"));
        break;
      case "track":
        dispatch(repeat("off"));
        break;
    }
  }

  function handleMute() {
    dispatch(mute(!playlistPlayback.muted));
  }

  function handleShuffle() {
    const newShuffle = !playlistPlayback.shuffle;
    dispatch(shuffle(newShuffle));
  }

  function handleSoundboardStop(id: string) {
    dispatch(stopSound(id));
    onSoundboardStop(id);
  }

  const time =
    timeOverride === null
      ? playlistPlayback.playback?.progress || 0
      : timeOverride;
  const duration = playlistPlayback.playback?.duration || 0;

  const noTrack = playlistPlayback.track?.title === undefined;

  const large = useMediaQuery("(min-width: 500px)");

  const sounds = Object.values(soundboardPlayback.playback);

  const title = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: large ? "30%" : "100%",
        flexDirection: "column",
      }}
    >
      <Typography
        variant="body2"
        sx={{ width: "100%", textAlign: large ? undefined : "center" }}
        noWrap
        gutterBottom
      >
        {noTrack ? "" : playlistPlayback.track.title}
      </Typography>
      <Typography
        variant="caption"
        color="rgba(255, 255, 255, 0.8)"
        sx={{ width: "100%", textAlign: large ? undefined : "center" }}
        noWrap
      >
        {noTrack
          ? ""
          : playlists.playlists.byId[playlistPlayback.queue.playlistId]?.title}
      </Typography>
    </Box>
  );

  const controls = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mt: -1,
        flexGrow: 1,
      }}
    >
      <IconButton aria-label="shuffle" onClick={handleShuffle}>
        <Shuffle color={playlistPlayback.shuffle ? "primary" : undefined} />
      </IconButton>
      <IconButton
        disabled={!Boolean(playlistPlayback.playback)}
        aria-label="previous"
        onClick={() => onPlaylistPrevious()}
      >
        <Previous />
      </IconButton>
      <IconButton
        aria-label={playlistPlayback.playing ? "pause" : "play"}
        onClick={handlePlay}
        disabled={!Boolean(playlistPlayback.playback)}
      >
        {playlistPlayback.playing ? (
          <Pause sx={{ fontSize: "3rem" }} />
        ) : (
          <PlayArrow sx={{ fontSize: "3rem" }} />
        )}
      </IconButton>
      <IconButton
        disabled={!Boolean(playlistPlayback.playback)}
        aria-label="next"
        onClick={() => onPlaylistNext()}
      >
        <Next />
      </IconButton>
      <IconButton
        aria-label={`repeat ${playlistPlayback.repeat}`}
        onClick={handlRepeat}
      >
        {playlistPlayback.repeat === "off" ? (
          <RepeatIcon />
        ) : playlistPlayback.repeat === "playlist" ? (
          <RepeatIcon color="primary" />
        ) : (
          <RepeatOne color="primary" />
        )}
      </IconButton>
    </Box>
  );
  const volume = (
    <Stack
      spacing={2}
      direction="row"
      sx={{ mb: 1, px: 1, width: large ? "30%" : "100%" }}
      alignItems="center"
    >
      <IconButton
        aria-label={playlistPlayback.muted ? "unmute" : "mute"}
        onClick={handleMute}
      >
        {playlistPlayback.muted ? <VolumeOff /> : <VolumeDown />}
      </IconButton>
      <VolumeSlider
        aria-label="Volume"
        value={playlistPlayback.muted ? 0 : playlistPlayback.volume}
        step={0.01}
        min={0}
        max={1}
        onChange={handleVolumeChange}
      />
      {!large && (
        <Box px={2} height="24px">
          <VolumeUp sx={{ color: "rgba(255,255,255,0.4)" }} />
        </Box>
      )}
    </Stack>
  );

  const timeSlider = (
    <Box>
      <TimeSlider
        aria-label="time-indicator"
        size="small"
        value={time}
        min={0}
        step={1}
        max={duration}
        disabled={!Boolean(playlistPlayback.playback)}
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
  );

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
        elevation={5}
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          p: 2,
          backgroundColor: "rgba(34, 38, 57, 0.8)",
          backdropFilter: "blur(10px)",
        }}
      >
        {sounds.length > 0 && (
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
        )}
        {large ? (
          <>
            <Stack direction="row">
              {title}
              {controls}
              {volume}
            </Stack>
            {timeSlider}
          </>
        ) : (
          <>
            {title}
            {timeSlider}
            {controls}
            {volume}
          </>
        )}
      </Paper>
    </Container>
  );
}
