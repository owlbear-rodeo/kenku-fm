import React from "react";
import ListItem from "@mui/material/ListItem";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/CloseRounded";

import { Tab, selectTab, removeTab } from "./tabsSlice";
import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { getBounds } from "./getBounds";

type TabType = {
  tab: Tab;
  selected?: boolean;
  allowClose?: boolean;
};

export function Tab({ tab, selected, allowClose }: TabType) {
  const playerTabId = useSelector((state: RootState) => state.player.tab.id);
  const tabIds = useSelector((state: RootState) => state.tabs.tabs.allIds);
  const dispatch = useDispatch();

  return (
    <ListItem
      secondaryAction={
        allowClose && (
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
              dispatch(selectTab(prevTabId));
            }}
          >
            <CloseIcon />
          </IconButton>
        )
      }
      disablePadding
    >
      <ListItemButton
        sx={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))",
        }}
        role={undefined}
        dense
        selected={selected}
        onClick={() => dispatch(selectTab(tab.id))}
      >
        {tab.icon && (
          <Box
            sx={{
              width: "24px",
              height: "24px",
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
              textOverflow: "ellipsis",
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}
