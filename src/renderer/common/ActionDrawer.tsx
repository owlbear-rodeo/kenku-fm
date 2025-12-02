import React, { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import { Toolbar, Stack, Typography, Link } from "@mui/material";
import { OutputListItems } from "../features/output/OutputListItems";
import { InputListItems } from "../features/input/InputListItems";
import { BookmarkListItems } from "../features/bookmarks/BookmarkListItems";
import { Settings } from "../features/settings/Settings";
import { setDiscordOutputVolume } from "../features/settings/settingsSlice";

import { RootState } from "../app/store";
import { useSelector, useDispatch } from "react-redux";

import icon from "../../assets/icon.svg";
import { useHideScrollbar } from "./useHideScrollbar";
import { showWindowControls } from "./showWindowControls";

export const drawerWidth = 240;

export function ActionDrawer() {
  const settings = useSelector((state: RootState) => state.settings);
  const connection = useSelector((state: RootState) => state.connection);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dispatch = useDispatch();

  const scrollRef = useRef<HTMLDivElement>(null);
  const hideScrollbar = useHideScrollbar(scrollRef);

  function handleDiscordVolumeChange(_: Event, value: number | number[]) {
    const v = Array.isArray(value) ? value[0] : value;
    dispatch(setDiscordOutputVolume(v));
    // Forward to the audio capture window via preload API
    window.kenku.setDiscordOutputVolume(v);
  }

  return (
    <Box component="nav" sx={{ width: drawerWidth, flexShrink: 0 }}>
      <Drawer
        variant="permanent"
        sx={{
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            border: "none",
            bgcolor: "background.default",
            overflowY: "initial",
          },
        }}
        open
      >
        <Toolbar
          sx={{
            justifyContent: showWindowControls ? "space-between" : "end",
            bgcolor: "background.paper",
            px: 1,
            WebkitAppRegion: "drag",
            minHeight: "52px",
          }}
          disableGutters
          variant="dense"
          onDoubleClick={(e) =>
            e.target === e.currentTarget && window.kenku.toggleMaximize()
          }
        >
          {showWindowControls && (
            <Box sx={{ width: "36px", height: "36px", m: 1 }}>
              <img src={icon} />
            </Box>
          )}
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ WebkitAppRegion: "no-drag" }}
          >
            <SettingsIcon />
          </IconButton>
          <Settings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Toolbar>
        <Box sx={{ overflowY: "auto" }} ref={scrollRef} {...hideScrollbar}>
          <Stack>
            <BookmarkListItems />
            {settings.externalInputsEnabled && <InputListItems />}
            <OutputListItems />
            {connection.status === "disconnected" && (
              <Typography variant="caption" align="center" marginY={2}>
                Connect{" "}
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => setSettingsOpen(true)}
                >
                  Discord
                </Link>{" "}
                for more outputs
              </Typography>
            )}
          </Stack>
        </Box>
        <Box
          sx={{
            width: drawerWidth * 0.8,
            mx: "auto",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            pb: 2,
          }}
          {...hideScrollbar}
        >
          <Stack spacing={1} sx={{ pt: 1 }}>
            <Typography variant="caption">Discord Output Volume</Typography>
            <Slider
              value={settings.discordOutputVolume ?? 1}
              min={0}
              max={2}
              step={0.01}
              onChange={handleDiscordVolumeChange}
              valueLabelDisplay="auto"
            />
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}
