import React from "react";
import List from "@mui/material/List";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { TabItem } from "./TabItem";
import { PlayerTab } from "../player/PlayerTab";
import { AddTabButton } from "./AddTabButton";

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
        <TabItem
          key={tabId}
          tab={tabState.tabs.byId[tabId]}
          selected={tabState.selectedTab === tabId}
          allowClose
        />
      ))}
      <AddTabButton />
    </List>
  );
}
