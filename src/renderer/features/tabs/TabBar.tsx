import React from "react";
import List from "@mui/material/List";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/AddRounded";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Tab } from "./Tab";
import { PlayerTab } from "../player/PlayerTab";

export function TabBar() {
  const tabState = useSelector((state: RootState) => state.tabs);
  return (
    <List
      sx={{
        flexDirection: "row",
        display: "flex",
        alignItems: "center",
        px: 1,
      }}
    >
      <PlayerTab />
      {tabState.tabs.allIds.map((tabId) => (
        <Tab
          key={tabId}
          tab={tabState.tabs.byId[tabId]}
          selected={tabState.selectedTab === tabId}
          allowClose
        />
      ))}
      <IconButton sx={{ mx: 1 }} size="small">
        <AddIcon />
      </IconButton>
    </List>
  );
}
