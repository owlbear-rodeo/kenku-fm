import React, { useEffect, useState, useRef } from "react";

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
  const apps = useSelector((state: RootState) => state.apps);
  const remote = useSelector((state: RootState) => state.remote);
  const browserViews = useSelector((state: RootState) => state.browserViews);

  const [showControls, setShowControls] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);

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
    const allApps = Object.values(apps.apps.byId);
    if (remote.enabled) {
      allApps.push(remote.app);
    }
    if (apps.selectedApp === undefined) {
      // Remove browser views that have been deleted
      const views = Object.values(browserViews.browserViews.byId);
      const appIds = allApps.map((app) => app.id);
      const viewAppIds = views.map((view) => view.appId);
      const diff = [...viewAppIds].filter((id) => !appIds.includes(id));
      for (let id of diff) {
        const view = views.find((view) => view.appId === id);
        if (view) {
          dispatch(removeBrowserView(view.id));
          window.kenku.removeBrowserView(view.id);
        }
      }
      return;
    }

    // Create or select a browser view
    const app = allApps.find((app) => app.id === apps.selectedApp);
    if (!app) {
      return;
    }
    const view = Object.values(browserViews.browserViews.byId).find(
      (browserView) => browserView.appId === apps.selectedApp
    );

    async function createBrowserView() {
      const bounds = getBounds(controlsRef.current);
      const isRemote = app.id === remote.app.id;
      const id = await window.kenku.createBrowserView(
        app.url,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        // Add the remote preload script
        isRemote ? remote.app.preload : undefined
      );
      if (isRemote) {
        window.kenku.remoteRegisterView(id);
      }
      dispatch(addBrowserView({ id, appId: app.id, url: app.url }));
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
  }, [apps.selectedApp, remote.enabled]);

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
  }, [showControls]);

  function handleURLChange(url: string) {
    dispatch(editBrowserView({ id: browserViews.selectedBrowserView, url }));
  }

  const selectedBrowserView =
    browserViews.selectedBrowserView !== undefined &&
    browserViews.browserViews.byId[browserViews.selectedBrowserView];

  return showControls ? (
    <BrowserViewControls
      viewId={selectedBrowserView?.id || -1}
      url={selectedBrowserView?.url || ""}
      onURLChange={handleURLChange}
      ref={controlsRef}
      disabled={!Boolean(selectedBrowserView)}
    />
  ) : null;
}
