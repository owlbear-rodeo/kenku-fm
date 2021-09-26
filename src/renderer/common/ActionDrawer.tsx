import React, { useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import { Toolbar, Stack, Typography, Link } from "@mui/material";
import { OutputListItems } from "../features/output/OutputListItems";
import { AppListItems } from "../features/apps/AppListItems";
import { Settings } from "../features/settings/Settings";

import { RootState } from "../app/store";
import { useSelector } from "react-redux";

import icon from "../../assets/icon.svg";

export const drawerWidth = 240;

export function ActionDrawer() {
  const connection = useSelector((state: RootState) => state.connection);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Box component="nav" sx={{ width: drawerWidth }}>
      <Drawer
        variant="permanent"
        sx={{
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            border: "none",
            bgcolor: "background.default",
          },
        }}
        open
      >
        <Toolbar
          sx={{
            justifyContent: "space-between",
            bgcolor: "background.paper",
            px: 1,
          }}
          disableGutters
        >
          <Box sx={{ width: "48px", height: "48px", mx: 1 }}>
            <img src={icon} />
          </Box>
          <IconButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
          <Settings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Toolbar>
        <Stack>
          <AppListItems />
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
      </Drawer>
    </Box>
  );
}
