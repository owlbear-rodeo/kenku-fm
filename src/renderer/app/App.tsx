import React, { useEffect } from 'react';
// import 'typeface-roboto/index.css';
import { useSnackbar } from 'notistack';

import {
  Box,
  Typography,
  Stack,
  AppBar,
  Toolbar,
  useTheme,
} from '@material-ui/core';
import { Settings } from '../features/settings/Settings';
import { ActionDrawer } from '../common/ActionDrawer';

import { View } from '../features/apps/View';

import icon from '../../../assets/icon.svg';

import './App.css';

export function App() {
  const { enqueueSnackbar } = useSnackbar();

  const theme = useTheme();

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
    <Box>
      <AppBar
        sx={{ position: 'relative', zIndex: theme.zIndex.drawer + 1 }}
        elevation={1}
      >
        <Toolbar sx={{ justifyContent: 'center', bgcolor: 'background.paper' }}>
          <Box sx={{ width: '48px', height: '48px', mx: 1 }}>
            <img src={icon} />
          </Box>
          <Typography variant="h4" component="h1">
            Kenku <span style={{ fontSize: '1rem' }}>fm</span>
          </Typography>
          <Box sx={{ position: 'absolute', right: '24px' }}>
            <Settings />
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex' }}>
        <Stack direction="row" sx={{ flexGrow: 1 }}>
          <ActionDrawer />
          <View />
        </Stack>
      </Box>
    </Box>
  );
}
