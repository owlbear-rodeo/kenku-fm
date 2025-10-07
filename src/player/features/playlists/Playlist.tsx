import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import Add from "@mui/icons-material/AddCircleRounded";
import Back from "@mui/icons-material/ChevronLeftRounded";
import MoreVert from "@mui/icons-material/MoreVertRounded";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { RootState } from "../../app/store";
import { backgrounds, isBackground } from "../../backgrounds";
import { useFolderDrop } from "../../common/useFolderDrop";
import { addTracksToQueueIfNeeded, startQueue } from "./playlistPlaybackSlice";
import { PlaylistSettings } from "./PlaylistSettings";
import { addTracks, removePlaylist, Track } from "./playlistsSlice";
import { PlaylistTracks } from "./PlaylistTracks";
import { TrackAdd } from "./TrackAdd";

type PlaylistProps = {
  onPlay: (track: Track) => void;
};

export function Playlist({ onPlay }: PlaylistProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const playlists = useSelector((state: RootState) => state.playlists);
  const { playlistId } = useParams();
  const playlist = playlists.playlists.byId[playlistId];

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
    navigate(-1);
    handleMenuClose();
  }

  function handleTrackPlay(trackId: string) {
    const track = playlists.tracks[trackId];
    if (track) {
      let tracks = [...playlist.tracks];
      dispatch(startQueue({ tracks, trackId, playlistId: playlist.id }));
      onPlay(track);
    }
  }

  const { dragging, containerListeners, overlayListeners } = useFolderDrop(
    (directories) => {
      const tracks: Track[] = [];
      for (let directory of Object.values(directories)) {
        tracks.push(...directory.audioFiles);
      }
      dispatch(addTracks({ tracks, playlistId: playlist.id }));
      dispatch(
        addTracksToQueueIfNeeded({
          playlistId: playlist.id,
          trackIds: tracks.map((track) => track.id),
        }),
      );
    },
  );

  return (
    <>
      <Container
        sx={{
          padding: "0px !important",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
        {...containerListeners}
      >
        <Box
          sx={{
            backgroundImage: `url("${image}")`,
            backgroundSize: "cover",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            backgroundImage:
              "linear-gradient(0deg, #ffffff44 30%,  #00000088 100%)",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        />
        <Stack
          p={4}
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ zIndex: 1 }}
        >
          <IconButton onClick={() => navigate(-1)} sx={{ mr: "40px" }}>
            <Back />
          </IconButton>
          <Typography sx={{ zIndex: 1 }} variant="h3" noWrap>
            {playlist.title}
          </Typography>
          <Stack direction="row">
            <Tooltip title="Add Track">
              <IconButton onClick={() => setAddOpen(true)}>
                <Add />
              </IconButton>
            </Tooltip>
            <IconButton onClick={handleMenuClick}>
              <MoreVert />
            </IconButton>
          </Stack>
        </Stack>
        <PlaylistTracks
          items={items}
          playlist={playlist}
          onPlay={handleTrackPlay}
        />
        <Backdrop
          open={dragging}
          sx={{ zIndex: 100, bgcolor: "rgba(0, 0, 0, 0.8)" }}
          {...overlayListeners}
        >
          <Typography sx={{ pointerEvents: "none" }}>
            Drop the tracks here...
          </Typography>
        </Backdrop>
      </Container>
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
      <TrackAdd
        playlistId={playlist.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <PlaylistSettings
        playlist={playlist}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
