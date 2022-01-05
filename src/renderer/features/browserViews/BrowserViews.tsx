import React, { useEffect, useState, useRef, useMemo } from "react";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import {
  addBrowserView,
  editBrowserView,
  removeBrowserView,
  selectBrowserView,
} from "./browserViewsSlice";

import { BrowserViewControls } from "./BrowserViewControls";

import { drawerWidth } from "../../common/ActionDrawer";

function getBounds(controls: HTMLDivElement | null) {
  return {
    x: drawerWidth,
    y: controls?.clientHeight || 0,
    width: window.innerWidth - drawerWidth,
    height: window.innerHeight,
  };
}

export function BrowserViews() {
  const dispatch = useDispatch();
  const bookmarks = useSelector((state: RootState) => state.bookmarks);
  const player = useSelector((state: RootState) => state.player);
  const browserViews = useSelector((state: RootState) => state.browserViews);

  const selectedBrowserView = useMemo(
    () => browserViews.browserViews.byId[browserViews.selectedBrowserView],
    [browserViews]
  );

  const [showControls, setShowControls] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const isPlayer = useMemo(
    () => selectedBrowserView?.bookmarkId === player.app.id,
    [selectedBrowserView, player.app]
  );

  useEffect(() => {
    window.kenku.on("SHOW_CONTROLS", (args) => {
      const show = args[0];
      setShowControls(show);
    });
    window.kenku.on("BROWSER_VIEW_DID_NAVIGATE", (args) => {
      const viewId = args[0];
      const url = args[1];
      dispatch(editBrowserView({ id: viewId, url }));
    });

    return () => {
      window.kenku.removeAllListeners("SHOW_CONTROLS");
      window.kenku.removeAllListeners("BROWSER_VIEW_DID_NAVIGATE");
    };
  }, []);

  useEffect(() => {
    const allBookmarks = Object.values(bookmarks.bookmarks.byId);
    allBookmarks.push(player.app);
    if (bookmarks.selectedBookmark === undefined) {
      // Remove browser views that have been deleted
      const views = Object.values(browserViews.browserViews.byId);
      const appIds = allBookmarks.map((app) => app.id);
      const viewAppIds = views.map((view) => view.bookmarkId);
      const diff = [...viewAppIds].filter((id) => !appIds.includes(id));
      for (let id of diff) {
        const view = views.find((view) => view.bookmarkId === id);
        if (view) {
          dispatch(removeBrowserView(view.id));
          window.kenku.removeBrowserView(view.id);
        }
      }
      return;
    }

    // Create or select a browser view
    const app = allBookmarks.find(
      (app) => app.id === bookmarks.selectedBookmark
    );
    if (!app) {
      return;
    }
    const view = Object.values(browserViews.browserViews.byId).find(
      (browserView) => browserView.bookmarkId === bookmarks.selectedBookmark
    );

    async function createBrowserView() {
      const bounds = getBounds(controlsRef.current);
      const isPlayer = app.id === player.app.id;
      const id = await window.kenku.createBrowserView(
        app.url,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        // Add the player preload script
        isPlayer ? player.app.preload : undefined
      );
      if (isPlayer) {
        window.kenku.playerRegisterView(id);
      }
      dispatch(addBrowserView({ id, bookmarkId: app.id, url: app.url }));
      dispatch(selectBrowserView(id));
    }

    if (browserViews.selectedBrowserView) {
      window.kenku.hideBrowserView(browserViews.selectedBrowserView);
    }

    if (view === undefined) {
      createBrowserView();
    } else {
      dispatch(selectBrowserView(view.id));
      window.kenku.showBrowserView(view.id);
      const bounds = getBounds(controlsRef.current);
      window.kenku.setBrowserViewBounds(
        view.id,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );
    }
  }, [bookmarks.selectedBookmark, player]);

  useEffect(() => {
    if (browserViews.selectedBrowserView) {
      const bounds = getBounds(controlsRef.current);
      window.kenku.setBrowserViewBounds(
        browserViews.selectedBrowserView,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );
    }
  }, [showControls, isPlayer]);

  function handleURLChange(url: string) {
    dispatch(editBrowserView({ id: browserViews.selectedBrowserView, url }));
  }

  return showControls && !isPlayer ? (
    <BrowserViewControls
      viewId={selectedBrowserView?.id || -1}
      url={selectedBrowserView?.url || ""}
      onURLChange={handleURLChange}
      ref={controlsRef}
      disabled={!Boolean(selectedBrowserView)}
    />
  ) : null;
}
