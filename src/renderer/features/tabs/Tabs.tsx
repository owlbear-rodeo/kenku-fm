import React, { useEffect, useMemo } from "react";
import Stack from "@mui/material/Stack";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import {
  addTab,
  decreaseTabPlayingMedia,
  editTab,
  increaseTabPlayingMedia,
  removeTab,
  selectTab,
} from "./tabsSlice";

import { URLBar } from "./URLBar";
import { TabBar } from "./TabBar";
import { getBounds } from "./getBounds";
import {
  decreasePlayingMedia,
  increasePlayingMedia,
} from "../player/playerSlice";
import { editBookmark } from "../bookmarks/bookmarksSlice";

/**
 * Safely parse a URL string. Returns a URL object if valid, otherwise null.
 * Logs a warning when the URL is malformed.
 */
const safeURL = (urlString: string): URL | null => {
  try {
    return new URL(urlString);
  } catch {
    console.warn(`Invalid URL detected: ${urlString}`);
    return null;
  }
};

export function Tabs() {
  const dispatch = useDispatch();
  const player = useSelector((state: RootState) => state.player);
  const tabs = useSelector((state: RootState) => state.tabs);
  const bookmarks = useSelector((state: RootState) => state.bookmarks);
  const settings = useSelector((state: RootState) => state.settings);

  const selectedTab = useMemo(() => tabs.tabs.byId[tabs.selectedTab], [tabs]);

  const isPlayer = useMemo(
    () => tabs.selectedTab === player.tab.id,
    [tabs.selectedTab, player.tab],
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

      let validFavicons: string[] = [];
      if (Array.isArray(favicons)) {
        favicons.forEach((favicon) => {
          const url = safeURL(favicon);
          if (url) {
            validFavicons.push(favicon);
          }
        });
      }

      if (validFavicons.length === 0) {
        return;
      }

      const tab = tabs.tabs.byId[viewId];

      const getParts = (url: URL) => {
        const hostname = url.hostname;
        const parts = hostname.split(".");

        if (parts.length > 2) {
          return parts.slice(parts.length - 2).join(".");
        }

        return hostname;
      };

      if (tab) {
        const tabUrlObj = safeURL(tab.url);
        if (!tabUrlObj) {
          return;
        }
        const tabUrl = getParts(tabUrlObj);

        const bookmarkItems = Object.values(bookmarks.bookmarks.byId);
        const hasMatch = bookmarkItems.filter((bookmark) => {
          const bookmarkUrlObj = safeURL(bookmark.url);
          if (!bookmarkUrlObj) return false;
          const url = getParts(bookmarkUrlObj);
          return url === tabUrl;
        });

        if (hasMatch.length > 0) {
          hasMatch.forEach((match) => {
            dispatch(editBookmark({ id: match.id, icon: validFavicons[0] }));
          });
        }
      }

      dispatch(editTab({ id: viewId, icon: validFavicons[0] || "" }));
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
        bounds.height,
      );
      dispatch(
        addTab({
          id,
          url: "",
          title: "New Tab",
          icon: "",
          playingMedia: 0,
          muted: false,
        }),
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
        bounds.height,
      );
    }
  }, [settings.urlBarEnabled, isPlayer, tabs.selectedTab]);

  function handleURLChange(url: string) {
    const urlObj = safeURL(url);
    if (!urlObj) return;
    dispatch(editTab({ id: tabs.selectedTab, url }));
  }

  return (
    <Stack sx={{ flexGrow: 1, minWidth: 0 }} id="controls">
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
  );
}
