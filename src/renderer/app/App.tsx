import React, { useEffect, useState } from "react";
// import 'typeface-roboto/index.css';

import { Snackbar, Stack } from "@material-ui/core";
import { ActionDrawer } from "../common/ActionDrawer";

import { RootState } from "./store";
import { useSelector } from "react-redux";

import { View } from "../features/apps/View";

import "./App.css";

export function App() {
  const apps = useSelector((state: RootState) => state.apps);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    window.kenku.on("message", (args) => {
      const message = args[0];
      setMessage(message);
    });
    window.kenku.on("error", (args) => {
      const error = args[0];
      setMessage(error);
    });

    return () => {
      window.kenku.removeAllListeners("message");
      window.kenku.removeAllListeners("error");
    };
  }, []);

  return (
    <Stack direction="row" sx={{ flexGrow: 1 }}>
      <ActionDrawer />
      <View
        url={apps.selectedApp ? apps.apps.byId[apps.selectedApp].url : ""}
      />
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={6000}
        onClose={() => setMessage(undefined)}
        message={message}
      />
    </Stack>
  );
}
