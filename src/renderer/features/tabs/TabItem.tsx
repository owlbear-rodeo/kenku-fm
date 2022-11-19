import React from "react";
import ListItem from "@mui/material/ListItem";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/CloseRounded";
import VolumeIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffIcon from "@mui/icons-material/VolumeOffRounded";

import { Tab, selectTab, removeTab, editTab } from "./tabsSlice";
import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setMuted } from "../player/playerSlice";

type TabType = {
  tab: Tab;
  selected?: boolean;
  allowClose?: boolean;
  shadow?: boolean;
};

export function TabItem({ tab, selected, allowClose, shadow }: TabType) {
  const playerTabId = useSelector((state: RootState) => state.player.tab.id);
  const tabIds = useSelector((state: RootState) => state.tabs.tabs.allIds);
  const dispatch = useDispatch();

  return (
    <ListItem
      secondaryAction={
        <>
          {tab.playingMedia > 0 && (
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
          {allowClose && (
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
          pr:
            // Both close and media controls enabled
            allowClose && tab.playingMedia > 0
              ? "62px"
              : // Either close or media controls enabled
              allowClose || tab.playingMedia > 0
              ? "38px"
              : // None enabled
                2,
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
