import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import PlaylistIcon from '@material-ui/icons/AudiotrackRounded';
import ExpandLess from '@material-ui/icons/ExpandLessRounded';
import ExpandMore from '@material-ui/icons/ExpandMoreRounded';
import React, { useState } from 'react';

export function PlaylistListItems() {
  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen(!open);
  }

  return (
    <>
      <ListItemButton onClick={toggleOpen}>
        <ListItemText primary="Playlists" />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {['Playlist 1', 'Playlist 2', 'Playlist 3', 'Playlist 4'].map(
            (text, index) => (
              <ListItemButton
                dense
                key={text}
                selected={index === 0}
                sx={{ px: 2 }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: '36px',
                    color: index === 0 ? 'primary.main' : undefined,
                  }}
                >
                  <PlaylistIcon />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            )
          )}
        </List>
      </Collapse>
    </>
  );
}
