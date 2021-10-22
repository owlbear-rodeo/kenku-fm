import React, { useEffect } from "react";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setRemoteURL, setRemoteEnabled } from "./remoteSlice";
import { selectApp } from "../apps/appsSlice";

import { AppListItem } from "../apps/AppListItem";

export function RemoteApp() {
  const dispatch = useDispatch();

  const apps = useSelector((state: RootState) => state.apps);
  const remote = useSelector((state: RootState) => state.remote);
  const browserViews = useSelector((state: RootState) => state.browserViews);

  useEffect(() => {
    window.kenku.on("REMOTE_ENABLED", (args) => {
      const enabled = args[0];
      dispatch(setRemoteEnabled(enabled));
      if (enabled) {
        dispatch(selectApp(remote.app.id));
      } else {
        dispatch(selectApp(undefined));
        dispatch(setRemoteURL(""));
      }
    });

    window.kenku.on("REMOTE_OPEN_URL", (args) => {
      const url = args[0];
      dispatch(setRemoteURL(url));
      dispatch(selectApp(remote.app.id));
      const remoteView = Object.values(browserViews.browserViews.byId).find(
        (view) => view.appId === remote.app.id
      );
      if (remoteView) {
        window.kenku.loadURL(remoteView.id, url);
      }
    });

    return () => {
      window.kenku.removeAllListeners("REMOTE_ENABLED");
      window.kenku.removeAllListeners("REMOTE_OPEN_URL");
    };
  }, [browserViews]);

  if (!remote.enabled) {
    return null;
  }

  return (
    <AppListItem
      app={remote.app}
      selected={apps.selectedApp === remote.app.id}
      key={remote.app.id}
    />
  );
}
