import React from 'react';
import { AppBar, Toolbar } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayCircleFilledRounded';
import PauseIcon from '@material-ui/icons/PauseRounded';
import CircularProgress from '@material-ui/core/CircularProgress';

import { RootState } from '../../app/store';
import { useSelector, useDispatch } from 'react-redux';
import { togglePlay, getCurrentItem } from '../playback/playbackSlice';

export function Playback() {
  const playlist = useSelector((state: RootState) => state.playlist);
  const playback = useSelector((state: RootState) => state.playback);
  const dispatch = useDispatch();

  function handlePlay() {
    const id = getCurrentItem(playback);
    if (id) {
      const item = playlist.items.byId[id];
      togglePlay(item, playback, dispatch);
    }
  }

  return (
    <AppBar
      position="relative"
      sx={{ top: 'auto', bottom: 0, alignItems: 'center' }}
    >
      <Toolbar>
        <IconButton
          onClick={handlePlay}
          disabled={
            playback.state === 'loading' || playback.state === 'unknown'
          }
          size="large"
          sx={{
            width: '48px',
            height: '48px',
            padding: 0,
            fontSize: '2rem',
          }}
        >
          {playback.state === 'loading' ? (
            <CircularProgress size={24} />
          ) : playback.state === 'playing' ? (
            <PauseIcon fontSize="inherit" />
          ) : (
            <PlayIcon fontSize="inherit" />
          )}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
