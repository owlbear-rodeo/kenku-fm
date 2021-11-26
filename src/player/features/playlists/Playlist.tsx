import React, { useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Add from "@mui/icons-material/AddRounded";
import Tooltip from "@mui/material/Tooltip";
import List from "@mui/material/List";
import Box from "@mui/material/Box";
import Back from "@mui/icons-material/ChevronLeftRounded";
import MoreVert from "@mui/icons-material/MoreVertRounded";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  Playlist as PlaylistType,
  selectPlaylist,
  removePlaylist,
} from "./playlistsSlice";
import { TrackAdd } from "./TrackAdd";
import { PlaylistSettings } from "./PlaylistSettings";
import { TrackItem } from "./TrackItem";

import { isBackground, backgrounds } from "../../backgrounds";

type PlaylistProps = {
  playlist: PlaylistType;
  onPlay: (id: string) => void;
};

export function Playlist({ playlist, onPlay }: PlaylistProps) {
  const dispatch = useDispatch();
  const playlists = useSelector((state: RootState) => state.playlists);

  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const items = playlist.tracks.map((id) => playlists.tracks[id]);

  const image = isBackground(playlist.background)
    ? backgrounds[playlist.background]
    : playlist.background;

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
    navigator.clipboard.writeText(playlist.id);
    handleMenuClose();
  }

  function handleDelete() {
    dispatch(removePlaylist(playlist.id));
    dispatch(selectPlaylist(undefined));
    handleMenuClose();
  }

  return (
    <Container
      sx={{
        padding: "0px !important",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <Stack
        p={4}
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          backgroundImage: `url("${image}")`,
          backgroundSize: "cover",
          position: "relative",
        }}
      >
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
        <IconButton
          onClick={() => dispatch(selectPlaylist(undefined))}
          id="more-button"
          aria-controls="playlist-menu"
          aria-haspopup="true"
        >
          <Back />
        </IconButton>
        <Typography sx={{ zIndex: 1 }} variant="h3">
          {playlist.title}
        </Typography>
        <IconButton onClick={handleMenuClick}>
          <MoreVert />
        </IconButton>
      </Stack>
      <Paper sx={{ mx: "auto", mt: 2, mb: 0, borderRadius: "30px" }}>
        <Tooltip title="Add Track">
          <IconButton size="large" onClick={() => setAddOpen(true)}>
            <Add />
          </IconButton>
        </Tooltip>
      </Paper>
      <List sx={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
        {items.map((item) => (
          <TrackItem key={item.id} track={item} playlist={playlist} />
        ))}
      </List>
      <TrackAdd
        playlistId={playlist.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
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
      <PlaylistSettings
        playlist={playlist}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Container>
  );
}
