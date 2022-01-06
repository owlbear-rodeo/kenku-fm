import React, { useEffect, useState } from "react";

import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import styled from "@mui/material/styles/styled";

import { ActionDrawer } from "../common/ActionDrawer";

import { Tabs } from "../features/tabs/Tabs";

import "./App.css";

const WallPaper = styled("div")({
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  background: "linear-gradient(#2D3143 0%, #1e2231 100%)",
  zIndex: -1,
});

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
    <Stack direction="row">
      <WallPaper />
      <ActionDrawer />
      <Tabs />
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(undefined)}
        message={message}
        sx={{ maxWidth: "192px" }}
      />
    </Stack>
  );
}
