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
    kenku: {
      connect: (token: string) => void;
      disconnect: () => void;
      joinChannel: (channelId: string) => void;
      createBrowserView: (url: string, xOffset: number) => number;
      removeBrowserView: (id: number) => void;
      loadURL: (id: number, url: string) => void;
      goForward: (id: number) => void;
      goBack: (id: number) => void;
      reload: (id: number) => void;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
