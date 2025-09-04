import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import CloseIcon from "@mui/icons-material/CloseRounded";
import VolumeOffIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeIcon from "@mui/icons-material/VolumeUpRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import React from "react";

import { v4 as uuid } from "uuid";

import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../app/store";
import { addBookmark, removeBookmark } from "../bookmarks/bookmarksSlice";
import { setMuted } from "../player/playerSlice";
import { safeURL } from "./Tabs";
import { Tab, editTab, removeTab, selectTab } from "./tabsSlice";

type TabType = {
  tab: Tab;
  selected?: boolean;
  allowClose?: boolean;
  shadow?: boolean;
};

export function TabItem({ tab, selected, allowClose, shadow }: TabType) {
  const playerTabId = useSelector((state: RootState) => state.player.tab.id);
  const tabIds = useSelector((state: RootState) => state.tabs.tabs.allIds);
  const bookmarks = useSelector(
    (state: RootState) => state.bookmarks.bookmarks.byId,
  );
  const dispatch = useDispatch();

  const isBookmarked = Object.values(bookmarks).filter((bookmark) => {
    return bookmark.url === tab.url;
  });

  const showMedia = tab.playingMedia > 0;
  const showBookmark = Boolean(safeURL(tab.url) && selected && allowClose);
  const showClose = Boolean(allowClose);
  const shownIcons =
    Number(showBookmark) + Number(showClose) + Number(showMedia);

  return (
    <ListItem
      secondaryAction={
        <>
          {showMedia && (
            <IconButton
              edge="end"
              aria-label={tab.muted ? "unmute" : "mute"}
              size="small"
              onClick={() => {
                const muted = !tab.muted;
                window.kenku.setMuted(tab.id, muted);
                if (tab.id === playerTabId) {
                  dispatch(setMuted(muted));
                } else {
                  dispatch(editTab({ id: tab.id, muted }));
                }
              }}
            >
              {tab.muted ? (
                <VolumeOffIcon sx={{ fontSize: "1rem" }} />
              ) : (
                <VolumeIcon sx={{ fontSize: "1rem" }} />
              )}
            </IconButton>
          )}
          {showBookmark && (
            <IconButton
              edge="end"
              size="small"
              aria-label="bookmark"
              onClick={() => {
                if (isBookmarked.length === 0) {
                  const id = uuid();
                  dispatch(
                    addBookmark({
                      id,
                      url: tab.url,
                      title: tab.title,
                      icon: tab.icon,
                    }),
                  );
                } else {
                  dispatch(removeBookmark(isBookmarked[0].id));
                }
              }}
            >
              {isBookmarked.length === 0 ? (
                <BookmarkBorderIcon sx={{ fontSize: "1rem" }} />
              ) : (
                <BookmarkIcon sx={{ fontSize: "1rem" }} />
              )}
            </IconButton>
          )}
          {showClose && (
            <IconButton
              edge="end"
              aria-label="close"
              size="small"
              onClick={() => {
                // Find previous tab so we can select when closing the tab
                const prevTabIndex = tabIds.indexOf(tab.id) - 1;
                const prevTabId = tabIds[prevTabIndex] || playerTabId; // If there's no previous use the kenku player tab

                // Remove tab and select previous
                dispatch(removeTab(tab.id));
                window.kenku.removeBrowserView(tab.id);

                // Only change if this is the selected app
                if (selected) {
                  dispatch(selectTab(prevTabId));
                }
              }}
            >
              <CloseIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          )}
        </>
      }
      sx={{
        minWidth: "76px",
        "& .MuiListItemSecondaryAction-root": {
          right: "12px",
        },
        "& .MuiListItemButton-root": {
          pr: `${shownIcons * 23 + 8}px`,
        },
        WebkitAppRegion: "no-drag",
      }}
      disablePadding
    >
      <ListItemButton
        sx={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))",
          minWidth: 0,
          mx: 0.5,
          my: 0,
          boxShadow: shadow ? 4 : "none",
        }}
        role={undefined}
        dense
        selected={selected}
        onClick={() => dispatch(selectTab(tab.id))}
      >
        {tab.icon && (
          <Box
            sx={{
              minWidth: "16px",
              minHeight: "16px",
              maxWidth: "16px",
              maxHeight: "16px",
              objectFit: "cover",
              marginRight: 1,
              display: "flex",
            }}
          >
            <img src={tab.icon} />
          </Box>
        )}
        <ListItemText
          primary={tab.title}
          sx={{
            ".MuiListItemText-primary": {
              whiteSpace: "nowrap",
              overflow: "hidden",
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}
