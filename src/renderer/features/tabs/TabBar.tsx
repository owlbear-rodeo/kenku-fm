import React, { useEffect, useRef, useState } from "react";
import List from "@mui/material/List";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { TabItem } from "./TabItem";
import { PlayerTab } from "../player/PlayerTab";
import { AddTabButton } from "./AddTabButton";

export function TabBar() {
  const tabState = useSelector((state: RootState) => state.tabs);

  const containerRef = useRef<HTMLUListElement>(null);
  const [smallTabs, setSmallTabs] = useState(false);
  // Observe tab bar size and change to small tabs mode if needed
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const tabLength = Math.max(tabState.tabs.allIds.length + 1, 1);
      const updateTabSizeIfNeeded = (tabSize: number) => {
        if (tabSize < 150 && !smallTabs) {
          setSmallTabs(true);
        } else if (tabSize > 180 && smallTabs) {
          setSmallTabs(false);
        }
      };

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        const rect = entry?.contentRect;
        if (rect) {
          updateTabSizeIfNeeded(rect.width / tabLength);
        }
      });

      updateTabSizeIfNeeded(container.clientWidth / tabLength);

      observer.observe(container);

      return () => {
        observer.unobserve(container);
      };
    }
  }, [smallTabs, tabState.tabs.allIds]);

  return (
    <List
      ref={containerRef}
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
          tab={{
            ...tabState.tabs.byId[tabId],
            icon:
              // Hide icon if we're in small tab mode and the tab is selected to ensure the close icon will fit
              smallTabs && tabState.selectedTab === tabId
                ? ""
                : tabState.tabs.byId[tabId].icon,
          }}
          selected={tabState.selectedTab === tabId}
          // Hide the close icon if we're in small tab mode and we're not selected
          allowClose={smallTabs ? tabState.selectedTab === tabId : true}
        />
      ))}
      <AddTabButton />
    </List>
  );
}
