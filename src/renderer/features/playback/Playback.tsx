import React from 'react';
import { AppBar, Toolbar, Stack, Typography, Box } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayCircleFilledRounded';
import PauseIcon from '@material-ui/icons/PauseRounded';
import RepeatIcon from '@material-ui/icons/RepeatRounded';
import RepeatOneIcon from '@material-ui/icons/RepeatOneRounded';
import ShuffleIcon from '@material-ui/icons/ShuffleRounded';
import NextIcon from '@material-ui/icons/SkipNextRounded';
import PreviousIcon from '@material-ui/icons/SkipPreviousRounded';
import CircularProgress from '@material-ui/core/CircularProgress';

import { RootState } from '../../app/store';
import { useSelector, useDispatch } from 'react-redux';
import {
  togglePlay,
  getCurrentItem,
  toggleShuffle,
  toggleLoop,
} from '../playback/playbackSlice';

export function Playback() {
  const playlist = useSelector((state: RootState) => state.playlist);
  const playback = useSelector((state: RootState) => state.playback);
  const dispatch = useDispatch();

  const itemId = getCurrentItem(playback);
  const item = itemId && playlist.items.byId[itemId];

  function handlePlay() {
    if (item) {
      togglePlay(item, playback, dispatch);
    }
  }

  const disabled = playback.state === 'loading' || playback.state === 'unknown';

  return (
    <AppBar
      position="relative"
      sx={{ top: 'auto', bottom: 0, alignItems: 'center' }}
    >
      <Toolbar>
        <Stack sx={{ my: 1, alignItems: 'center' }}>
          <Typography
            variant="overline"
            sx={{
              width: '200px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item && item.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton
              disabled={disabled}
              onClick={() => dispatch(toggleShuffle())}
              sx={{
                color: playback.shuffle ? 'primary.main' : undefined,
              }}
            >
              <ShuffleIcon />
            </IconButton>
            <IconButton disabled={disabled}>
              <PreviousIcon />
            </IconButton>
            <IconButton
              onClick={handlePlay}
              disabled={disabled}
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
            <IconButton disabled={disabled}>
              <NextIcon />
            </IconButton>
            <IconButton
              disabled={disabled}
              onClick={() => dispatch(toggleLoop())}
              sx={{
                color:
                  playback.loop === 'on' || playback.loop === 'one'
                    ? 'primary.main'
                    : undefined,
              }}
            >
              {playback.loop === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
            </IconButton>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
