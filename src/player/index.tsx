import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import CssBaseline from "@mui/material/CssBaseline";
import ThemeProvider from "@mui/material/styles/ThemeProvider";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { PersistGate } from "redux-persist/integration/react";

import { App } from "./app/App";
import { theme } from "../renderer/app/theme";
import { store, persistor } from "./app/store";
import { MemoryRouter } from "react-router-dom";

import "./index.css";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <PersistGate
      loading={
        <Backdrop open>
          <CircularProgress />
        </Backdrop>
      }
      persistor={persistor}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    </PersistGate>
  </Provider>
);
