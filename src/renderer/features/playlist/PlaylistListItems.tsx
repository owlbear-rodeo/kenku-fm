import React, { useState } from 'react';
import {
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
} from '@material-ui/core';
import ExpandLess from '@material-ui/icons/ExpandLessRounded';
import ExpandMore from '@material-ui/icons/ExpandMoreRounded';
import AddIcon from '@material-ui/icons/AddRounded';

import { RootState } from '../../app/store';
import { useSelector, useDispatch } from 'react-redux';
import { addPlaylist } from './playlistSlice';

import { PlaylistListItem } from './PlaylistListItem';

export function PlaylistListItems() {
  const playlist = useSelector((state: RootState) => state.playlist);
  const dispatch = useDispatch();

  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen(!open);
  }

  return (
    <>
      <ListItemButton onClick={toggleOpen}>
        <ListItemText primary="Playlists" />
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            dispatch(addPlaylist());
          }}
        >
          <AddIcon />
        </IconButton>
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {playlist.playlists.allIds.map((id) => (
            <PlaylistListItem
              playlist={playlist.playlists.byId[id]}
              selected={playlist.selectedPlaylist === id}
              key={id}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}
