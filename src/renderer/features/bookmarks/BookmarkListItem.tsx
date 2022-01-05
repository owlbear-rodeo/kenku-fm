import React, { useState } from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreIcon from "@mui/icons-material/MoreHorizRounded";

import { useDispatch } from "react-redux";
import { Bookmark, selectBookmark, removeBookmark } from "./bookmarksSlice";
import { BookmarkSettings } from "./BookmarkSettings";

type BookmarkListItemProps = {
  bookmark: Bookmark;
  selected: boolean;
  shadow?: Boolean;
};

export function BookmarkListItem({
  bookmark,
  selected,
  shadow,
}: BookmarkListItemProps) {
  const dispatch = useDispatch();

  const [settingsOpen, setSettingsOpen] = useState(false);

  function select() {
    !selected && dispatch(selectBookmark(bookmark.id));
  }

  function handleRemove() {
    dispatch(removeBookmark(bookmark.id));
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
        {bookmark.icon && (
          <Box
            sx={{
              width: "24px",
              height: "24px",
              objectFit: "cover",
              marginRight: 1,
            }}
          >
            <img src={bookmark.icon} />
          </Box>
        )}
        <ListItemText primary={bookmark.title} />
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
      <BookmarkSettings
        bookmark={bookmark}
        open={settingsOpen}
        onClose={closeSettings}
      />
    </>
  );
}
