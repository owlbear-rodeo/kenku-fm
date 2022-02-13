import React, { useState } from "react";
import Grid from "@mui/material/Grid";
import PlayArrow from "@mui/icons-material/PlayArrowRounded";
import IconButton from "@mui/material/IconButton";
import Repeat from "@mui/icons-material/RepeatRounded";
import Stop from "@mui/icons-material/StopRounded";
import MoreVert from "@mui/icons-material/MoreVertRounded";
import VolumeUp from "@mui/icons-material/VolumeUp";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import styled from "@mui/material/styles/styled";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";

import { Sound, removeSound, Soundboard } from "./soundboardsSlice";
import { useDispatch, useSelector } from "react-redux";
import { SoundSettings } from "./SoundSettings";
import { RootState } from "../../app/store";
import { stopSound } from "./soundboardPlaybackSlice";

type SoundItemProps = {
  sound: Sound;
  soundboard: Soundboard;
  onPlay: (id: string) => void;
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

export function SoundItem({
  sound,
  soundboard,
  onPlay,
  onStop,
}: SoundItemProps) {
  const playback = useSelector((state: RootState) => state.soundboardPlayback);
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
    if (sound.id in playback.playback) {
      onStop(sound.id);
    } else {
      onPlay(sound.id);
    }
  }

  const playing = sound.id in playback.playback;

  return (
    <>
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(34, 38, 57, 0.8)",
          height: "150px",
        }}
      >
        <CardContent>
          <Box sx={{ display: "flex" }}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              {sound.title}
            </Typography>
            <IconButton onClick={handleMenuClick}>
              <MoreVert />
            </IconButton>
          </Box>
        </CardContent>
        <Box
          sx={{ display: "flex", gap: 2, alignItems: "center", px: 2, pb: 1 }}
        >
          <IconButton aria-label={sound.repeat ? "no repeat" : "repeat"}>
            {sound.repeat ? <Repeat color="primary" /> : <Repeat />}
          </IconButton>
          <Box height="24px">
            <VolumeUp sx={{ color: "rgba(255,255,255,0.4)" }} />
          </Box>
          <VolumeSlider
            aria-label="Volume"
            value={sound.volume}
            step={0.01}
            min={0}
            max={1}
          />
          <IconButton
            aria-label={playing ? "stop" : "play"}
            onClick={handlePlayStop}
          >
            {playing ? (
              <Stop sx={{ fontSize: "3rem" }} />
            ) : (
              <PlayArrow sx={{ fontSize: "3rem" }} />
            )}
          </IconButton>
        </Box>
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
