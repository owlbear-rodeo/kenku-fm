import React, { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import styled from "@mui/material/styles/styled";
import Alert from "@mui/material/Alert";

import { ActionDrawer } from "../common/ActionDrawer";

import { Tabs } from "../features/tabs/Tabs";

import icon from "../../assets/icon.svg";

import "./App.css";
import Typography from "@mui/material/Typography";

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
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatalError, setFatalError] = useState<string>();

  useEffect(() => {
    window.kenku.on("MESSAGE", (args) => {
      const message = args[0];
      setMessages((messages) => ({ ...messages, [uuid()]: message }));
    });
    window.kenku.on("ERROR", (args) => {
      const error = args[0];
      setErrors((errors) => ({ ...errors, [uuid()]: error }));
    });
    window.kenku.on("FATAL_ERROR", (args) => {
      window.kenku.removeAllBrowserViews();
      const error = args[0];
      setFatalError(error);
    });

    return () => {
      window.kenku.removeAllListeners("MESSAGE");
      window.kenku.removeAllListeners("ERROR");
      window.kenku.removeAllListeners("FATAL_ERROR");
    };
  }, []);

  if (fatalError) {
    return (
      <Stack direction="row">
        <WallPaper />
        <Stack
          position="absolute"
          left="0"
          right="0"
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
          gap={1}
        >
          <Stack sx={{ width: "68px", height: "68px", m: 1 }}>
            <img src={icon} />
          </Stack>
          <Typography variant="h4" color="white">
            Oops, something went wrong..
          </Typography>
          <Typography variant="body1" color="white">
            {fatalError}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack direction="row">
      <WallPaper />
      <ActionDrawer />
      <Tabs />
      <Stack
        sx={{ position: "fixed", bottom: 24, left: 24, gap: 1, zIndex: 1400 }}
      >
        {Object.entries(messages).map(([key, message], i) => (
          <Snackbar
            key={key}
            open={Boolean(message)}
            autoHideDuration={4000}
            onClose={() => setMessages(({ [key]: _, ...rest }) => rest)}
            message={message}
            sx={{ maxWidth: "192px", position: "initial" }}
          />
        ))}
        {Object.entries(errors).map(([key, error], i) => (
          <Snackbar
            key={key}
            open={Boolean(error)}
            onClose={() => setErrors(({ [key]: _, ...rest }) => rest)}
            sx={{
              maxWidth: "192px",
              position: "initial",
            }}
          >
            <Alert severity="error">{error}</Alert>
          </Snackbar>
        ))}
      </Stack>
    </Stack>
  );
}
