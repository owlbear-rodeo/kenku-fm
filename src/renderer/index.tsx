import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import CssBaseline from '@material-ui/core/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider } from '@material-ui/core/styles';
import { Backdrop, CircularProgress } from '@material-ui/core';
import { PersistGate } from 'redux-persist/integration/react';

import { App } from './app/App';
import { theme } from './app/theme';
import { store, persistor } from './app/store';

render(
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
        <SnackbarProvider maxSnack={3}>
          <CssBaseline />
          <App />
        </SnackbarProvider>
      </ThemeProvider>
    </PersistGate>
  </Provider>,
  document.getElementById('root')
);

declare global {
  interface Window {
    discord: {
      connect: (token: string) => void;
      play: (url: string, id: string) => void;
      pause: (id: string) => void;
      resume: (id: string) => void;
      stop: (id: string) => void;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
      getInfo: (url: string, id: string) => void;
      validateUrl: (url: string, id: string) => void;
      joinChannel: (channelId: string) => void;
    };
  }
}
