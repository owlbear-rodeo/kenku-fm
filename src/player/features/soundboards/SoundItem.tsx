import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import MoreVert from "@mui/icons-material/MoreVertRounded";
import PlayArrow from "@mui/icons-material/PlayArrowRounded";
import Loop from "@mui/icons-material/RepeatRounded";
import Stop from "@mui/icons-material/StopRounded";
import VolumeUp from "@mui/icons-material/VolumeUp";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import styled from "@mui/material/styles/styled";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import { RootState } from "../../app/store";
import { Sound, Soundboard, editSound, removeSound } from "./soundboardsSlice";
import { SoundSettings } from "./SoundSettings";

type SoundItemProps = {
  id: string;
  soundboard: Soundboard;
  onPlay: (sound: Sound) => void;
  onStop: (id: string) => void;
};

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

export function SoundItem({ id, soundboard, onPlay, onStop }: SoundItemProps) {
  const sound = useSelector((state: RootState) => state.soundboards.sounds[id]);
  const playing = useSelector(
    (state: RootState) => sound.id in state.soundboardPlayback.playback,
  );
  const dispatch = useDispatch();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  function handleMenuClick(event: React.MouseEvent<HTMLButtonElement>) {
    setAnchorEl(event.currentTarget);
  }
  function handleMenuClose() {
    setAnchorEl(null);
  }

  function handleEdit() {
    setSettingsOpen(true);
    handleMenuClose();
  }

  function handleCopyID() {
    navigator.clipboard.writeText(sound.id);
    handleMenuClose();
  }

  function handleDelete() {
    dispatch(removeSound({ soundId: sound.id, soundboardId: soundboard.id }));
    handleMenuClose();
  }

  function handlePlayStop() {
    if (playing) {
      onStop(sound.id);
    } else {
      onPlay(sound);
    }
  }

  function handleVolumeChange(_: Event, value: number | number[]) {
    dispatch(editSound({ id: sound.id, volume: value as number }));
  }

  function handleToggleLoop() {
    dispatch(editSound({ id: sound.id, loop: !sound.loop }));
  }

  const loopToggle = (
    <IconButton
      aria-label={sound.loop ? "no loop" : "loop"}
      onClick={handleToggleLoop}
    >
      {sound.loop ? (
        <Loop color="primary" sx={{ padding: 0 }} />
      ) : (
        <Loop sx={{ padding: 0 }} />
      )}
    </IconButton>
  );

  const volumeSlider = (
    <>
      <Box height="24px" sx={{ padding: 0 }}>
        <VolumeUp sx={{ color: "rgba(255,255,255,0.4)" }} />
      </Box>
      <VolumeSlider
        aria-label="Volume"
        // Prevent drag and drop when using slider
        onPointerDown={(e) => e.stopPropagation()}
        onChange={handleVolumeChange}
        value={sound.volume}
        step={0.01}
        min={0}
        max={1}
      />
    </>
  );

  const playButton = (
    <IconButton
      aria-label={playing ? "stop" : "play"}
      onClick={handlePlayStop}
      sx={{ padding: 0 }}
    >
      {playing ? (
        <Stop sx={{ fontSize: "2.5rem" }} />
      ) : (
        <PlayArrow sx={{ fontSize: "2.5rem" }} />
      )}
    </IconButton>
  );

  return (
    <>
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(34, 38, 57, 0.8)",
          position: "relative",
        }}
      >
        <CardActionArea
          sx={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
        />
        <CardContent sx={{ py: 2, ":last-child": { pb: 2 } }}>
          <Stack direction="column" gap={0.5} justifyContent="space-between">
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                {sound.title}
              </Typography>
              <IconButton onClick={handleMenuClick}>
                <MoreVert />
              </IconButton>
            </Stack>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              {loopToggle}
              {volumeSlider}
              {playButton}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <Menu
        id="soundboard-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        MenuListProps={{
          "aria-labelledby": "more-button",
        }}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleCopyID}>Copy ID</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>
      <SoundSettings
        sound={sound}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
