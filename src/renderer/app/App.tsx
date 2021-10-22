import React, { useEffect, useState } from "react";

import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { ActionDrawer } from "../common/ActionDrawer";

import { BrowserViews } from "../features/browserViews/BrowserViews";

import "./App.css";

export function App() {
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    window.kenku.on("MESSAGE", (args) => {
      const message = args[0];
      setMessage(message);
    });
    window.kenku.on("ERROR", (args) => {
      const error = args[0];
      setMessage(error);
    });

    return () => {
      window.kenku.removeAllListeners("MESSAGE");
      window.kenku.removeAllListeners("ERROR");
    };
  }, []);

  return (
    <Stack direction="row" sx={{ flexGrow: 1 }}>
      <ActionDrawer />
      <BrowserViews />
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={6000}
        onClose={() => setMessage(undefined)}
        message={message}
        sx={{ maxWidth: "192px" }}
      />
    </Stack>
  );
}
