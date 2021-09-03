import React, { useEffect } from 'react';
import Stack from '@material-ui/core/Stack';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayArrowRounded';
import PauseIcon from '@material-ui/icons/PauseRounded';
import DeleteIcon from '@material-ui/icons/DeleteRounded';
import CircularProgress from '@material-ui/core/CircularProgress';

import { useDispatch, useSelector } from 'react-redux';
import {
  removeItem,
  editItem,
  PlaylistItem as PlaylistItemType,
  Playlist,
} from './playlistSlice';

import { RootState } from '../../app/store';
import {
  load,
  queue,
  togglePlay,
  PlaybackStateType,
} from '../playback/playbackSlice';

import { useDebounce } from '../../common/useDebounce';

type PlaylistItemProps = {
  playlist: Playlist;
  item: PlaylistItemType;
  state: PlaybackStateType;
};

export function PlaylistItem({ playlist, item, state }: PlaylistItemProps) {
  const playback = useSelector((state: RootState) => state.playback);

  const dispatch = useDispatch();

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editItem({ id: item.id, url: e.target.value, state: 'unknown' }));
  }

  function handleRemove() {
    dispatch(removeItem({ playlistId: playlist.id, itemId: item.id }));
  }

  function handlePlay() {
    // Try toggling item and load it if it wasn't playing
    if (!togglePlay(item, playback, dispatch)) {
      dispatch(queue(playlist.items));
      dispatch(load(item.id));
      window.discord.play(item.url, item.id);
    }
  }

  const debouncedItemUrl = useDebounce(item.url, 1000);
  const debouncedItemId = useDebounce(item.id, 1000);
  useEffect(() => {
    window.discord.validateUrl(debouncedItemUrl, debouncedItemId);
    window.discord.getInfo(debouncedItemUrl, debouncedItemId);
  }, [debouncedItemUrl, debouncedItemId]);

  return (
    <Paper sx={{ p: 1 }}>
      <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
        <TextField
          value={item.url}
          onChange={handleUrlChange}
          sx={{ flexGrow: 1 }}
          FormHelperTextProps={{
            sx: {
              color:
                state === 'playing' || state === 'paused'
                  ? 'primary.main'
                  : undefined,
            },
          }}
          variant="outlined"
          label="url"
          InputLabelProps={{
            shrink: true,
          }}
          size="small"
          helperText={item.title}
          error={!!item.url && item.state === 'invalid'}
        />
        <IconButton
          onClick={handlePlay}
          disabled={
            !item.url ||
            item.state === 'invalid' ||
            state === 'loading' ||
            item.state === 'unknown'
          }
        >
          {state === 'loading' ? (
            <CircularProgress size={24} />
          ) : state === 'playing' ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </IconButton>
        <IconButton onClick={handleRemove}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
