import React from "react";
import Box from "@material-ui/core/Box";
import Drawer from "@material-ui/core/Drawer";
import { Toolbar, Stack } from "@material-ui/core";
import { OutputListItems } from "../features/output/OutputListItems";
import { AppListItems } from "../features/apps/AppListItems";
import { Settings } from "../features/settings/Settings";

import icon from "../../assets/icon.svg";

export const drawerWidth = 240;

export function ActionDrawer() {
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
          <Settings />
        </Toolbar>
        <Stack>
          <AppListItems />
          <OutputListItems />
        </Stack>
      </Drawer>
    </Box>
  );
}
