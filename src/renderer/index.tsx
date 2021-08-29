import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import CssBaseline from '@material-ui/core/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider } from '@material-ui/core/styles';

import { App } from './app/App';
import { theme } from './app/theme';
import { store } from './app/store';

render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3}>
        <CssBaseline />
        <App />
      </SnackbarProvider>
    </ThemeProvider>
  </Provider>,
  document.getElementById('root')
);

declare global {
  interface Window {
    discord: {
      connect: (token: string) => void;
      play: (url: string, id: string) => void;
      stop: (id: string) => string;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
      getInfo: (url: string, id: string) => void;
      validateUrl: (url: string, id: string) => void;
    };
  }
}
