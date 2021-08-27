import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { store } from "./store";
import { Provider } from "react-redux";
import CssBaseline from "@material-ui/core/CssBaseline";
import "typeface-roboto/index.css";
import { ThemeProvider } from "@material-ui/core/styles";
import { SnackbarProvider } from "notistack";
import { useSnackbar } from "notistack";

import { Box, Container, Typography } from "@material-ui/core";
import { Playlist } from "../features/playlist/Playlist";

import { theme } from "./theme";

function App() {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    window.discord.on("message", (args) => {
      const message = args[0];
      enqueueSnackbar(message);
    });
    window.discord.on("error", (args) => {
      const error = args[0];
      enqueueSnackbar(error, {
        variant: "error",
      });
    });

    return () => {
      window.discord.removeAllListeners("message");
      window.discord.removeAllListeners("error");
    };
  }, [enqueueSnackbar]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          App
        </Typography>
        <Playlist />
      </Box>
    </Container>
  );
}

ReactDOM.render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3}>
        <CssBaseline />
        <App />
      </SnackbarProvider>
    </ThemeProvider>
  </Provider>,
  document.getElementById("root")
);
