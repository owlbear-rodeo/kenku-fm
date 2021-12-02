import React, { useState } from "react";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import PlayArrow from "@mui/icons-material/PlayArrowRounded";
import Pause from "@mui/icons-material/PauseRounded";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";

import MoreVert from "@mui/icons-material/MoreVertRounded";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { Track, removeTrack, Playlist } from "./playlistsSlice";
import { useDispatch, useSelector } from "react-redux";
import { TrackSettings } from "./TrackSettings";
import { RootState } from "../../app/store";
import { playPause } from "../playback/playbackSlice";

type TrackItemProps = {
  track: Track;
  playlist: Playlist;
  onPlay: (id: string) => void;
};

export function TrackItem({ track, playlist, onPlay }: TrackItemProps) {
  const playback = useSelector((state: RootState) => state.playback);
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
    navigator.clipboard.writeText(track.id);
    handleMenuClose();
  }

  function handleDelete() {
    dispatch(removeTrack({ trackId: track.id, playlistId: playlist.id }));
    handleMenuClose();
  }

  function handlePlayPause() {
    if (playback.track?.id === track.id) {
      dispatch(playPause(!playback.playing));
    } else {
      onPlay(track.id);
    }
  }

  const playing = playback.track?.id === track.id && playback.playing;

  return (
    <ListItem key={track.id} disablePadding>
      <Paper
        sx={{
          width: "100%",
          m: 0.5,
          backgroundColor: "rgba(34, 38, 57, 0.8)",
        }}
      >
        <ListItemButton role={undefined} sx={{ m: 0 }} dense>
          <ListItemText
            primary={track.title}
            sx={{
              ".MuiListItemText-primary": {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />
          <IconButton
            aria-label={playing ? "pause" : "play"}
            onClick={handlePlayPause}
          >
            {playing ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton onClick={handleMenuClick}>
            <MoreVert />
          </IconButton>
        </ListItemButton>
      </Paper>
      <Menu
        id="playlist-menu"
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
      <TrackSettings
        track={track}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </ListItem>
  );
}
