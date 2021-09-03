import React, { useEffect } from 'react';
import Stack from '@material-ui/core/Stack';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/AddRounded';

import { RootState } from '../../app/store';
import { useSelector, useDispatch } from 'react-redux';
import { addItem, editItem } from './playlistSlice';
import { play, stop, pause } from '../playback/playbackSlice';

import { PlaylistItem } from './PlaylistItem';
import { Box, Typography } from '@material-ui/core';

export function Playlist() {
  const playlist = useSelector((state: RootState) => state.playlist);
  const playback = useSelector((state: RootState) => state.playback);
  const dispatch = useDispatch();

  useEffect(() => {
    window.discord.on('play', () => {
      dispatch(play());
    });
    window.discord.on('stop', () => {
      dispatch(stop());
    });
    window.discord.on('pause', () => {
      dispatch(pause());
    });
    window.discord.on('info', (args) => {
      const title = args[0];
      const id = args[1];
      dispatch(editItem({ id, title }));
    });
    window.discord.on('validation', (args) => {
      const valid = args[0];
      const id = args[1];
      dispatch(editItem({ id, state: valid ? 'valid' : 'invalid' }));
    });

    return () => {
      window.discord.removeAllListeners('play');
      window.discord.removeAllListeners('stop');
      window.discord.removeAllListeners('pause');
      window.discord.removeAllListeners('info');
      window.discord.removeAllListeners('validation');
    };
  }, [dispatch]);

  if (playlist.selectedPlaylist === undefined) {
    return (
      <Box>
        <Typography>Select a playlist</Typography>
      </Box>
    );
  }

  const currentPlaylist = playlist.playlists.byId[playlist.selectedPlaylist];

  return (
    <Stack direction="column" spacing={1}>
      {currentPlaylist.items.map((id) => (
        <PlaylistItem
          key={id}
          item={playlist.items.byId[id]}
          playlist={currentPlaylist}
          state={playback.item === id ? playback.state : 'unknown'}
        />
      ))}
      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <IconButton
          onClick={() =>
            playlist.selectedPlaylist &&
            dispatch(addItem({ playlistId: playlist.selectedPlaylist }))
          }
        >
          <AddIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
