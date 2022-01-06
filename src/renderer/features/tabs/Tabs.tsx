import React, { useEffect, useState, useRef, useMemo } from "react";
import Stack from "@mui/material/Stack";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { editTab } from "./tabsSlice";

import { URLBar } from "./URLBar";
import { TabBar } from "./TabBar";
import { getBounds } from "./getBounds";

export function Tabs() {
  const dispatch = useDispatch();
  const player = useSelector((state: RootState) => state.player);
  const tabs = useSelector((state: RootState) => state.tabs);

  const selectedTab = useMemo(() => tabs.tabs.byId[tabs.selectedTab], [tabs]);

  const [showControls, setShowControls] = useState(false);

  const isPlayer = useMemo(
    () => tabs.selectedTab === player.tab.id,
    [tabs.selectedTab, player.tab]
  );

  useEffect(() => {
    window.kenku.on("SHOW_CONTROLS", (args) => {
      const show = args[0];
      setShowControls(show);
    });
    window.kenku.on("BROWSER_VIEW_DID_NAVIGATE", (args) => {
      const viewId = args[0];
      const url = args[1];
      dispatch(editTab({ id: viewId, url }));
    });
    window.kenku.on("BROWSER_VIEW_TITLE_UPDATED", (args) => {
      const viewId = args[0];
      const title = args[1];
      dispatch(editTab({ id: viewId, title }));
    });

    return () => {
      window.kenku.removeAllListeners("SHOW_CONTROLS");
      window.kenku.removeAllListeners("BROWSER_VIEW_DID_NAVIGATE");
      window.kenku.removeAllListeners("BROWSER_VIEW_TITLE_UPDATED");
    };
  }, []);

  useEffect(() => {
    if (tabs.selectedTab) {
      const bounds = getBounds();
      window.kenku.setBrowserViewBounds(
        tabs.selectedTab,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );
    }
  }, [showControls, isPlayer, tabs.selectedTab]);

  function handleURLChange(url: string) {
    dispatch(editTab({ id: tabs.selectedTab, url }));
  }

  return (
    <Stack sx={{ flexGrow: 1, minWidth: 0 }} id="controls">
      <TabBar />
      {showControls && !isPlayer && (
        <URLBar
          viewId={selectedTab?.id || -1}
          url={selectedTab?.url || ""}
          onURLChange={handleURLChange}
          disabled={!Boolean(selectedTab)}
        />
      )}
    </Stack>
  );
}
