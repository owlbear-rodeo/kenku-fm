import React, { useState } from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreIcon from "@mui/icons-material/MoreHorizRounded";

import { useDispatch } from "react-redux";
import { App, selectApp, removeApp } from "./appsSlice";
import { AppSettings } from "./AppSettings";

type AppListItemProps = {
  app: App;
  selected: boolean;
  shadow?: Boolean;
};

export function AppListItem({ app, selected, shadow }: AppListItemProps) {
  const dispatch = useDispatch();

  const [settingsOpen, setSettingsOpen] = useState(false);

  function select() {
    !selected && dispatch(selectApp(app.id));
  }

  function handleRemove() {
    dispatch(removeApp(app.id));
  }

  function openSettings() {
    setMore(null);
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  const [more, setMore] = React.useState<HTMLButtonElement | null>(null);

  function handleMoreClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setMore(event.currentTarget);
  }

  function handleMoreClose() {
    setMore(null);
  }

  const moreOpen = Boolean(more);
  const moreId = moreOpen ? "more-popover" : undefined;

  return (
    <>
      <ListItemButton
        dense
        selected={selected}
        sx={{ px: 2, boxShadow: shadow ? 10 : "none" }}
        onClick={select}
        onDoubleClick={openSettings}
      >
        {app.icon && (
          <Box
            sx={{
              width: "24px",
              height: "24px",
              objectFit: "cover",
              marginRight: 1,
            }}
          >
            <img src={app.icon} />
          </Box>
        )}
        <ListItemText primary={app.title} />
        <IconButton size="small" onClick={handleMoreClick}>
          <MoreIcon />
        </IconButton>
      </ListItemButton>
      <Menu
        id={moreId}
        anchorEl={more}
        open={moreOpen}
        onClose={handleMoreClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={openSettings}>Edit</MenuItem>
        <MenuItem onClick={handleRemove}>Delete</MenuItem>
      </Menu>
      <AppSettings app={app} open={settingsOpen} onClose={closeSettings} />
    </>
  );
}
