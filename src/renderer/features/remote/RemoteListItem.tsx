import React, { useEffect } from "react";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setEnabled } from "./remoteSlice";
import { selectApp } from "../apps/appsSlice";

export function RemoteListItem() {
  const dispatch = useDispatch();

  const apps = useSelector((state: RootState) => state.apps);
  const remote = useSelector((state: RootState) => state.remote);

  useEffect(() => {
    window.kenku.on("REMOTE_ENABLED", (args) => {
      const enabled = args[0];
      dispatch(setEnabled(enabled));
      if (enabled) {
        dispatch(selectApp(remote.app.id));
      } else {
        dispatch(selectApp(undefined));
      }
    });

    return () => {
      window.kenku.removeAllListeners("REMOTE_ENABLED");
    };
  }, [remote.app]);

  const selected = apps.selectedApp === remote.app.id;

  function select() {
    !selected && dispatch(selectApp(remote.app.id));
  }

  if (!remote.enabled) {
    return null;
  }

  return (
    <ListItemButton dense selected={selected} sx={{ px: 2 }} onClick={select}>
      <Box
        sx={{
          width: "24px",
          height: "24px",
          objectFit: "cover",
          marginRight: 1,
        }}
      >
        <img src={remote.app.icon} />
      </Box>
      <ListItemText primary={remote.app.title} />
    </ListItemButton>
  );
}
