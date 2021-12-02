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
import RepeatIcon from "@mui/icons-material/RepeatRounded";
import RepeatOne from "@mui/icons-material/RepeatOneRounded";
import Shuffle from "@mui/icons-material/ShuffleRounded";
import Next from "@mui/icons-material/SkipNextRounded";
import Previous from "@mui/icons-material/SkipPreviousRounded";
import Container from "@mui/material/Container";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../..//app/store";
import {
  adjustVolume,
  playPause,
  mute,
  shuffle,
  toggleRepeat,
  toggleMute,
  shuffleQueue,
  updateQueue,
} from "./playbackSlice";
import { Track } from "../playlists/playlistsSlice";

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
  onPlay: (track: Track) => void;
  onSeek: (to: number) => void;
};

export function Player({ onPlay, onSeek }: PlayerProps) {
  const dispatch = useDispatch();
  const playlists = useSelector((state: RootState) => state.playlists);
  const playback = useSelector((state: RootState) => state.playback);

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
    onSeek(value as number);
  }

  function handleVolumeChange(_: Event, value: number | number[]) {
    if (playback.muted && value > 0) {
      dispatch(mute());
    }
    dispatch(adjustVolume(value as number));
  }

  function handlePlay() {
    dispatch(playPause(!playback.playing));
  }

  function handlRepeat() {
    dispatch(toggleRepeat());
  }

  function handleMute() {
    dispatch(toggleMute());
  }

  function handleShuffle() {
    const newShuffle = !playback.shuffle;
    dispatch(shuffle(newShuffle));
    if (newShuffle) {
      dispatch(shuffleQueue());
    }
  }

  function handleNext() {
    if (playback.repeat === "off") {
      dispatch(playPause(false));
      onSeek(0);
    } else if (playback.repeat === "track") {
      onSeek(0);
    } else if (playback.repeat === "playlist" && playback.queue) {
      let index = (playback.queue.current + 1) % playback.queue.tracks.length;
      let id: string;
      if (playback.shuffle) {
        id = playback.queue.tracks[playback.queue.shuffled[index]];
      } else {
        id = playback.queue.tracks[index];
      }
      if (id) {
        const track = playlists.tracks[id];
        if (track) {
          onPlay(track);
          dispatch(updateQueue(index));
        }
      }
    }
  }

  function handlePrevious() {
    if (playback.repeat === "off") {
      dispatch(playPause(false));
      onSeek(0);
    } else if (playback.repeat === "track") {
      onSeek(0);
    } else if (playback.repeat === "playlist" && playback.queue) {
      let index = playback.queue.current;
      // Only go to previous if at the start of the track
      if (playback.playback.current < 5) {
        index -= 1;
      }
      if (index < 0) {
        index = playback.queue.tracks.length - 1;
      }
      let id: string;
      if (playback.shuffle) {
        id = playback.queue.tracks[playback.queue.shuffled[index]];
      } else {
        id = playback.queue.tracks[index];
      }
      if (id) {
        const track = playlists.tracks[id];
        if (track) {
          onPlay(track);
          dispatch(updateQueue(index));
        }
      }
    }
  }

  const time =
    timeOverride === null ? playback.playback?.current || 0 : timeOverride;
  const duration = playback.playback?.duration || 0;

  const noTrack = playback.track?.title === undefined;

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
          backgroundColor: "rgba(34, 38, 57, 0.8)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Stack direction="row">
          <Box sx={{ display: "flex", alignItems: "center", width: "30%" }}>
            <Typography variant="caption" sx={{ width: "100%" }} noWrap>
              {noTrack ? "" : playback.track.title}
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
            <IconButton aria-label="shuffle" onClick={handleShuffle}>
              <Shuffle color={playback.shuffle ? "primary" : undefined} />
            </IconButton>
            <IconButton
              disabled={!Boolean(playback.playback)}
              aria-label="previous"
              onClick={handlePrevious}
            >
              <Previous />
            </IconButton>
            <IconButton
              aria-label={playback.playing ? "pause" : "play"}
              onClick={handlePlay}
              disabled={!Boolean(playback.playback)}
            >
              {playback.playing ? (
                <Pause sx={{ fontSize: "3rem" }} />
              ) : (
                <PlayArrow sx={{ fontSize: "3rem" }} />
              )}
            </IconButton>
            <IconButton
              disabled={!Boolean(playback.playback)}
              aria-label="next"
              onClick={handleNext}
            >
              <Next />
            </IconButton>
            <IconButton
              aria-label={`repeat ${playback.repeat}`}
              onClick={handlRepeat}
            >
              {playback.repeat === "off" ? (
                <RepeatIcon />
              ) : playback.repeat === "playlist" ? (
                <RepeatIcon color="primary" />
              ) : (
                <RepeatOne color="primary" />
              )}
            </IconButton>
          </Box>
          <Stack
            spacing={2}
            direction="row"
            sx={{ mb: 1, px: 1, width: "30%" }}
            alignItems="center"
          >
            <IconButton
              aria-label={playback.muted ? "unmute" : "mute"}
              onClick={handleMute}
            >
              {playback.muted ? <VolumeOff /> : <VolumeDown />}
            </IconButton>
            <VolumeSlider
              aria-label="Volume"
              value={playback.muted ? 0 : playback.volume}
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
            disabled={!Boolean(playback.playback)}
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
