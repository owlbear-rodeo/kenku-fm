import Stack from "@mui/material/Stack";
import React, { useEffect, useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  addTab,
  decreaseTabPlayingMedia,
  editTab,
  increaseTabPlayingMedia,
  removeTab,
  selectTab,
} from "./tabsSlice";

import { IconButton } from "@mui/material";
import icon from "../../../assets/icon.svg";
import { setMenuState } from "../menu/menuSlice";
import {
  decreasePlayingMedia,
  increasePlayingMedia,
} from "../player/playerSlice";
import { TabBar } from "./TabBar";
import { URLBar } from "./URLBar";
import { getBounds } from "./getBounds";

export function Tabs() {
  const dispatch = useDispatch();
  const player = useSelector((state: RootState) => state.player);
  const tabs = useSelector((state: RootState) => state.tabs);
  const settings = useSelector((state: RootState) => state.settings);
  const menu = useSelector((state: RootState) => state.menu);

  const selectedTab = useMemo(() => tabs.tabs.byId[tabs.selectedTab], [tabs]);

  const isPlayer = useMemo(
    () => tabs.selectedTab === player.tab.id,
    [tabs.selectedTab, player.tab]
  );

  useEffect(() => {
    window.kenku.on("BROWSER_VIEW_DID_NAVIGATE", (args) => {
      const viewId = args[0];
      const url = args[1];
      dispatch(editTab({ id: viewId, url }));
    });
    window.kenku.on("BROWSER_VIEW_TITLE_UPDATED", (args) => {
      const viewId = args[0];
      const title = args[1];
      if (viewId === player.tab.id) {
        return;
      }
      dispatch(editTab({ id: viewId, title }));
    });
    window.kenku.on("BROWSER_VIEW_FAVICON_UPDATED", (args) => {
      const viewId = args[0];
      const favicons = args[1];
      if (viewId === player.tab.id) {
        return;
      }
      dispatch(editTab({ id: viewId, icon: favicons[0] || "" }));
    });
    window.kenku.on("BROWSER_VIEW_MEDIA_STARTED_PLAYING", (args) => {
      const viewId = args[0];
      if (viewId === player.tab.id) {
        dispatch(increasePlayingMedia());
      } else {
        dispatch(increaseTabPlayingMedia(viewId));
      }
    });
    window.kenku.on("BROWSER_VIEW_MEDIA_PAUSED", (args) => {
      const viewId = args[0];
      if (viewId === player.tab.id) {
        dispatch(decreasePlayingMedia());
      } else {
        dispatch(decreaseTabPlayingMedia(viewId));
      }
    });
    window.kenku.on("BROWSER_VIEW_NEW_TAB", async () => {
      const bounds = getBounds();
      const id = await window.kenku.createBrowserView(
        "",
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );
      dispatch(
        addTab({
          id,
          url: "",
          title: "New Tab",
          icon: "",
          playingMedia: 0,
          muted: false,
        })
      );
      dispatch(selectTab(id));
    });
    window.kenku.on("BROWSER_VIEW_CLOSE_TAB", async () => {
      const tabId = tabs.selectedTab;
      // Don't close the kenku player tab
      if (tabId && tabId !== player.tab.id) {
        const tabIds = tabs.tabs.allIds;
        // Find previous tab so we can select when closing the tab
        const prevTabIndex = tabIds.indexOf(tabId) - 1;
        const prevTabId = tabIds[prevTabIndex] || player.tab.id; // If there's no previous use the kenku player tab

        // Remove tab and select previous
        dispatch(removeTab(tabId));
        window.kenku.removeBrowserView(tabId);
        dispatch(selectTab(prevTabId));
      }
    });

    return () => {
      window.kenku.removeAllListeners("BROWSER_VIEW_DID_NAVIGATE");
      window.kenku.removeAllListeners("BROWSER_VIEW_TITLE_UPDATED");
      window.kenku.removeAllListeners("BROWSER_VIEW_FAVICON_UPDATED");
      window.kenku.removeAllListeners("BROWSER_VIEW_MEDIA_STARTED_PLAYING");
      window.kenku.removeAllListeners("BROWSER_VIEW_MEDIA_PAUSED");
      window.kenku.removeAllListeners("BROWSER_VIEW_NEW_TAB");
      window.kenku.removeAllListeners("BROWSER_VIEW_CLOSE_TAB");
    };
  }, [player.tab.id, tabs]);

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
  }, [settings.urlBarEnabled, isPlayer, tabs.selectedTab, menu.menuOpen]);

  function handleURLChange(url: string) {
    dispatch(editTab({ id: tabs.selectedTab, url }));
  }

  return (
    <Stack direction="row" sx={{ width: "100%" }}>
      {!menu.menuOpen && (
        <IconButton
          onClick={() => dispatch(setMenuState("open"))}
          sx={{
            width: "36px",
            height: "36px",
            m: 1,
            WebkitAppRegion: "no-drag",
          }}
        >
          <img src={icon} />
        </IconButton>
      )}
      <Stack sx={{ flexGrow: 1, width: "100%" }} id="controls">
        <TabBar />
        {settings.urlBarEnabled && !isPlayer && (
          <URLBar
            viewId={selectedTab?.id || -1}
            url={selectedTab?.url || ""}
            onURLChange={handleURLChange}
            disabled={!Boolean(selectedTab)}
          />
        )}
      </Stack>
    </Stack>
  );
}
