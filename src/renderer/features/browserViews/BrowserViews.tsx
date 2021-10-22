import React, { useEffect, useState } from "react";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import {
  addBrowserView,
  editBrowserView,
  selectBrowserView,
} from "./browserViewsSlice";

import { BrowserViewControls } from "./BrowserViewControls";

import { drawerWidth } from "../../common/ActionDrawer";

export function BrowserViews() {
  const dispatch = useDispatch();
  const apps = useSelector((state: RootState) => state.apps);
  const browserViews = useSelector((state: RootState) => state.browserViews);

  const [showControls, setShowControls] = useState(false);

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
    if (apps.selectedApp === undefined) {
      return;
    }
    const app = apps.apps.byId[apps.selectedApp];
    const view = Object.values(browserViews.browserViews.byId).find(
      (browserView) => browserView.appId === apps.selectedApp
    );

    async function createBrowserView() {
      const id = await window.kenku.createBrowserView(
        app.url,
        drawerWidth,
        // showControls ? 73 : 0,
        0,
        window.innerWidth - drawerWidth,
        window.innerHeight
      );
      dispatch(addBrowserView({ id, appId: app.id, url: app.url }));
    }

    if (browserViews.selectedBrowserView) {
      window.kenku.hideBrowserView(browserViews.selectedBrowserView);
    }

    if (view === undefined) {
      createBrowserView();
    } else {
      dispatch(selectBrowserView(view.id));
      window.kenku.showBrowserView(view.id);
    }
  }, [apps.selectedApp]);

  function handleURLChange(url: string) {
    dispatch(editBrowserView({ id: browserViews.selectedBrowserView, url }));
  }

  const selectedBrowserView =
    browserViews.selectedBrowserView &&
    browserViews.browserViews.byId[browserViews.selectedBrowserView];

  return showControls && selectedBrowserView ? (
    <BrowserViewControls
      viewId={selectedBrowserView.id}
      url={selectedBrowserView.url}
      onURLChange={handleURLChange}
    />
  ) : null;
}
