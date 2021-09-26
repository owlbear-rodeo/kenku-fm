import React, { useState } from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MoreIcon from "@mui/icons-material/MoreHorizRounded";

import { useDispatch } from "react-redux";
import { App, selectApp, removeApp } from "./appsSlice";
import { AppSettings } from "./AppSettings";

type AppListItemProps = {
  app: App;
  selected: boolean;
};

export function AppListItem({ app, selected }: AppListItemProps) {
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
        sx={{ px: 2 }}
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
      <Popover
        id={moreId}
        open={moreOpen}
        anchorEl={more}
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
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={openSettings}>
              <ListItemText primary="Edit" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleRemove}>
              <ListItemText primary="Delete" />
            </ListItemButton>
          </ListItem>
        </List>
      </Popover>
      <AppSettings app={app} open={settingsOpen} onClose={closeSettings} />
    </>
  );
}
