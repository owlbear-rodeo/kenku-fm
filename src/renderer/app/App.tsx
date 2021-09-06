import React, { useEffect } from 'react';
// import 'typeface-roboto/index.css';
import { useSnackbar } from 'notistack';

import { Stack } from '@material-ui/core';
import { ActionDrawer } from '../common/ActionDrawer';

import { View } from '../features/apps/View';

import './App.css';

export function App() {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    window.kenku.on('message', (args) => {
      const message = args[0];
      enqueueSnackbar(message);
    });
    window.kenku.on('error', (args) => {
      const error = args[0];
      enqueueSnackbar(error, {
        variant: 'error',
      });
    });

    return () => {
      window.kenku.removeAllListeners('message');
      window.kenku.removeAllListeners('error');
    };
  }, [enqueueSnackbar]);

  return (
    <Stack direction="row" sx={{ flexGrow: 1 }}>
      <ActionDrawer />
      <View />
    </Stack>
  );
}
