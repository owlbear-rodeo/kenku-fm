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
import { SoundAdd } from "./SoundAdd";
import { SoundboardSettings } from "./SoundboardSettings";
import { SoundboardSounds } from "./SoundboardSounds";
import { addSounds, removeSoundboard, Sound } from "./soundboardsSlice";

import { backgrounds, isBackground } from "../../backgrounds";
import { useFolderDrop } from "../../common/useFolderDrop";

type SoundboardProps = {
  onPlay: (sound: Sound) => void;
  onStop: (id: string) => void;
};

export function Soundboard({ onPlay, onStop }: SoundboardProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { soundboardId } = useParams();
  const soundboard = useSelector(
    (state: RootState) => state.soundboards.soundboards.byId[soundboardId]
  );

  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const image = isBackground(soundboard.background)
    ? backgrounds[soundboard.background]
    : soundboard.background;

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
    navigator.clipboard.writeText(soundboard.id);
    handleMenuClose();
  }

  function handleDelete() {
    dispatch(removeSoundboard(soundboard.id));
    navigate(-1);
    handleMenuClose();
  }

  const { dragging, containerListeners, overlayListeners } = useFolderDrop(
    (directories) => {
      const sounds: Sound[] = [];
      for (let directory of Object.values(directories)) {
        sounds.push(
          ...directory.audioFiles.map((file) => ({
            ...file,
            loop: false,
            volume: 1,
            fadeIn: 100,
            fadeOut: 100,
          }))
        );
      }
      dispatch(addSounds({ sounds, soundboardId: soundboard.id }));
    }
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
            {soundboard.title}
          </Typography>
          <Stack direction="row">
            <Tooltip title="Add Sound">
              <IconButton onClick={() => setAddOpen(true)}>
                <Add />
              </IconButton>
            </Tooltip>
            <IconButton onClick={handleMenuClick}>
              <MoreVert />
            </IconButton>
          </Stack>
        </Stack>
        <SoundboardSounds
          soundboard={soundboard}
          onPlay={onPlay}
          onStop={onStop}
        />
        <Backdrop
          open={dragging}
          sx={{ zIndex: 100, bgcolor: "rgba(0, 0, 0, 0.8)" }}
          {...overlayListeners}
        >
          <Typography sx={{ pointerEvents: "none" }}>
            Drop the sounds here...
          </Typography>
        </Backdrop>
      </Container>
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
      <SoundAdd
        soundboardId={soundboard.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <SoundboardSettings
        soundboard={soundboard}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
