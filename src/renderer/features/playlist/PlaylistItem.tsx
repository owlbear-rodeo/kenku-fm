import React, { useEffect } from 'react';
import Stack from '@material-ui/core/Stack';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayArrowRounded';
import PauseIcon from '@material-ui/icons/PauseRounded';
import DeleteIcon from '@material-ui/icons/DeleteRounded';
import CircularProgress from '@material-ui/core/CircularProgress';

import { useDispatch } from 'react-redux';
import {
  removeItem,
  editItem,
  PlaylistItem as PlaylistItemType,
} from './playlistSlice';
import { useDebounce } from '../../common/useDebounce';

type PlaylistItemProps = {
  item: PlaylistItemType;
};

export function PlaylistItem({ item }: PlaylistItemProps) {
  const dispatch = useDispatch();

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editItem({ id: item.id, url: e.target.value, state: 'unknown' }));
  }

  function handleRemove() {
    dispatch(removeItem(item.id));
  }

  function handlePlay() {
    if (item.state === 'playing') {
      dispatch(editItem({ id: item.id }));
      window.discord.pause(item.id);
    } else {
      dispatch(editItem({ id: item.id, state: 'loading' }));
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
            item.state === 'loading' ||
            item.state === 'unknown'
          }
        >
          {item.state === 'loading' ? (
            <CircularProgress size={24} />
          ) : item.state === 'playing' ? (
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
