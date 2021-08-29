import React, { useEffect } from 'react';
// import 'typeface-roboto/index.css';
import { useSnackbar } from 'notistack';

import { Box, Container, Typography, Stack } from '@material-ui/core';
import { Playlist } from '../features/playlist/Playlist';
import { ConnectionDialog } from '../features/connection/ConnectionDialog';

import icon from '../../../assets/icon.svg';

import './App.css';

export function App() {
  const { enqueueSnackbar } = useSnackbar();

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
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ width: '48px', height: '48px' }}>
            <img src={icon} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ flexGrow: 1 }}
          >
            Kenku <span style={{ fontSize: '1rem' }}>fm</span>
          </Typography>
          <ConnectionDialog />
        </Stack>
        <Playlist />
      </Box>
    </Container>
  );
}
