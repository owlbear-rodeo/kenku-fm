import React, { useState } from "react";

import styled from "@mui/material/styles/styled";
import Box from "@mui/material/Box";
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
import useMediaQuery from "@mui/material/useMediaQuery";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  adjustVolume,
  playPause,
  mute,
  shuffle,
  repeat,
} from "../playlists/playlistPlaybackSlice";

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

type PlaylistPlayerProps = {
  onPlaylistNext: () => void;
  onPlaylistPrevious: () => void;
  onPlaylistSeek: (to: number) => void;
};

function Title() {
  const playlists = useSelector((state: RootState) => state.playlists);
  const queue = useSelector((state: RootState) => state.playlistPlayback.queue);
  const track = useSelector((state: RootState) => state.playlistPlayback.track);
  const noTrack = track?.title === undefined;

  const large = useMediaQuery("(min-width: 500px)");

  return (
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
        {noTrack ? "" : track.title}
      </Typography>
      <Typography
        variant="caption"
        color="rgba(255, 255, 255, 0.8)"
        sx={{ width: "100%", textAlign: large ? undefined : "center" }}
        noWrap
      >
        {noTrack ? "" : playlists.playlists.byId[queue.playlistId]?.title}
      </Typography>
    </Box>
  );
}

function Controls({
  onPlaylistPrevious,
  onPlaylistNext,
}: Omit<PlaylistPlayerProps, "onPlaylistSeek">) {
  const dispatch = useDispatch();
  const playbackShuffle = useSelector(
    (state: RootState) => state.playlistPlayback.shuffle
  );
  const disabled = useSelector(
    (state: RootState) => !Boolean(state.playlistPlayback.playback)
  );
  const playing = useSelector(
    (state: RootState) => state.playlistPlayback.playing
  );
  const playbackRepeat = useSelector(
    (state: RootState) => state.playlistPlayback.repeat
  );

  function handlePlay() {
    dispatch(playPause(!playing));
  }

  function handlRepeat() {
    switch (playbackRepeat) {
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

  function handleShuffle() {
    const newShuffle = !playbackShuffle;
    dispatch(shuffle(newShuffle));
  }

  return (
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
        <Shuffle color={playbackShuffle ? "primary" : undefined} />
      </IconButton>
      <IconButton
        disabled={disabled}
        aria-label="previous"
        onClick={() => onPlaylistPrevious()}
      >
        <Previous />
      </IconButton>
      <IconButton
        aria-label={playing ? "pause" : "play"}
        onClick={handlePlay}
        disabled={disabled}
      >
        {playing ? (
          <Pause sx={{ fontSize: "3rem" }} />
        ) : (
          <PlayArrow sx={{ fontSize: "3rem" }} />
        )}
      </IconButton>
      <IconButton
        disabled={disabled}
        aria-label="next"
        onClick={() => onPlaylistNext()}
      >
        <Next />
      </IconButton>
      <IconButton aria-label={`repeat ${playbackRepeat}`} onClick={handlRepeat}>
        {playbackRepeat === "off" ? (
          <RepeatIcon />
        ) : playbackRepeat === "playlist" ? (
          <RepeatIcon color="primary" />
        ) : (
          <RepeatOne color="primary" />
        )}
      </IconButton>
    </Box>
  );
}

function Volume() {
  const dispatch = useDispatch();
  const large = useMediaQuery("(min-width: 500px)");

  const muted = useSelector((state: RootState) => state.playlistPlayback.muted);
  const volume = useSelector(
    (state: RootState) => state.playlistPlayback.volume
  );

  function handleVolumeChange(_: Event, value: number | number[]) {
    dispatch(adjustVolume(value as number));
    // TODO: handle value isArray
    if (muted) {
      if (!Array.isArray(value) && value > 0) {
        dispatch(mute(false));
      }
    }
  }

  function handleMute() {
    dispatch(mute(!muted));
  }

  return (
    <Stack
      spacing={2}
      direction="row"
      sx={{ mb: 1, px: 1, width: large ? "30%" : "100%" }}
      alignItems="center"
    >
      <IconButton aria-label={muted ? "unmute" : "mute"} onClick={handleMute}>
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
      {!large && (
        <Box px={2} height="24px">
          <VolumeUp sx={{ color: "rgba(255,255,255,0.4)" }} />
        </Box>
      )}
    </Stack>
  );
}

function Time({ onPlaylistSeek }: Pick<PlaylistPlayerProps, "onPlaylistSeek">) {
  const playback = useSelector(
    (state: RootState) => state.playlistPlayback.playback
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

  const time = timeOverride === null ? playback?.progress || 0 : timeOverride;
  const duration = playback?.duration || 0;

  return (
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
  );
}

export function PlaylistPlayer({
  onPlaylistNext,
  onPlaylistPrevious,
  onPlaylistSeek,
}: PlaylistPlayerProps) {
  const large = useMediaQuery("(min-width: 500px)");

  if (large) {
    return (
      <>
        <Stack direction="row">
          <Title />
          <Controls
            onPlaylistNext={onPlaylistNext}
            onPlaylistPrevious={onPlaylistPrevious}
          />
          <Volume />
        </Stack>
        <Time onPlaylistSeek={onPlaylistSeek} />
      </>
    );
  } else {
    return (
      <>
        <Title />
        <Time onPlaylistSeek={onPlaylistSeek} />
        <Controls
          onPlaylistNext={onPlaylistNext}
          onPlaylistPrevious={onPlaylistPrevious}
        />
        <Volume />
      </>
    );
  }
}
