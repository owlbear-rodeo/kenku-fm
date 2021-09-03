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
import { Playlist } from '../features/playlist/Playlist';
import { Playback } from '../features/playback/Playback';
import { ConnectionDialog } from '../features/connection/ConnectionDialog';
import { ActionDrawer } from '../common/ActionDrawer';

import icon from '../../../assets/icon.svg';

import './App.css';

export function App() {
  const { enqueueSnackbar } = useSnackbar();

  const theme = useTheme();

  useEffect(() => {
    window.discord.on('message', (args) => {
      const message = args[0];
      enqueueSnackbar(message);
    });
    window.discord.on('error', (args) => {
      const error = args[0];
      enqueueSnackbar(error, {
        variant: 'error',
      });
    });

    return () => {
      window.discord.removeAllListeners('message');
      window.discord.removeAllListeners('error');
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
            {/* <ConnectionDialog /> */}
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex' }}>
        <Stack direction="row" sx={{ flexGrow: 1 }}>
          <ActionDrawer />
          <Stack
            direction="column"
            sx={{
              height: {
                xs: 'calc(100vh - 56px)',
                sm: 'calc(100vh - 64px)',
              },
              flexGrow: 1,
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',

                py: 2,
                px: 3,
              }}
            >
              <Playlist />
            </Box>
            <Playback />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
