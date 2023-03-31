import React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import CssBaseline from "@mui/material/CssBaseline";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { PersistGate } from "redux-persist/integration/react";

import { App } from "./app/App";
import { theme } from "./app/theme";
import { store, persistor } from "./app/store";
import ErrorBoundary from "./common/ErrorBoundary";

render(
  <ThemeProvider theme={theme}>
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate
          loading={
            <Backdrop open>
              <CircularProgress />
            </Backdrop>
          }
          persistor={persistor}
        >
          <CssBaseline />
          <App />
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  </ThemeProvider>,
  document.getElementById("root")
);
