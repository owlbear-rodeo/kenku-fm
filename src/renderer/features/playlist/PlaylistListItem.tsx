import React, { useState } from 'react';
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  TextField,
} from '@material-ui/core';
import PlaylistIcon from '@material-ui/icons/AudiotrackRounded';
import DeleteIcon from '@material-ui/icons/DeleteRounded';

import { useDispatch } from 'react-redux';
import {
  Playlist,
  selectPlaylist,
  editPlaylist,
  removePlaylist,
} from './playlistSlice';

type PlaylistListItemProps = {
  playlist: Playlist;
  selected: boolean;
};

export function PlaylistListItem({
  playlist,
  selected,
}: PlaylistListItemProps) {
  const dispatch = useDispatch();

  const [editing, setEditing] = useState(false);

  function select() {
    !selected && dispatch(selectPlaylist(playlist.id));
  }

  function toggleEditing() {
    setEditing((prev) => !prev);
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editPlaylist({ id: playlist.id, name: e.target.value }));
  }

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditing(false);
  }

  function handleRemove(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    dispatch(removePlaylist(playlist.id));
  }

  return (
    <ListItemButton
      dense
      selected={selected}
      sx={{ px: 2 }}
      onClick={select}
      onDoubleClick={toggleEditing}
    >
      <ListItemIcon
        sx={{
          minWidth: '36px',
          color: selected ? 'primary.main' : undefined,
        }}
      >
        <PlaylistIcon />
      </ListItemIcon>
      {editing ? (
        <form onSubmit={handleNameSubmit}>
          <TextField
            value={playlist.name}
            onChange={handleNameChange}
            size="small"
            onDoubleClick={(e) => {
              e.stopPropagation();
            }}
          />
        </form>
      ) : (
        <ListItemText primary={playlist.name} />
      )}
      {!editing && (
        <IconButton size="small" onClick={handleRemove}>
          <DeleteIcon />
        </IconButton>
      )}
    </ListItemButton>
  );
}
