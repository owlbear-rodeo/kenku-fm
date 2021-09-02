import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import ExpandLess from '@material-ui/icons/ExpandLessRounded';
import ExpandMore from '@material-ui/icons/ExpandMoreRounded';
import VolumeIcon from '@material-ui/icons/VolumeUpRounded';

import React, { useState } from 'react';

export function OutputListItems() {
  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen(!open);
  }

  return (
    <>
      <ListItemButton onClick={toggleOpen}>
        <ListItemText primary="Output" />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <ListItemButton selected dense sx={{ px: 2 }}>
            <ListItemIcon sx={{ minWidth: '36px', color: 'primary.main' }}>
              <VolumeIcon />
            </ListItemIcon>
            <ListItemText primary="This Computer" />
          </ListItemButton>
        </List>
      </Collapse>
    </>
  );
}
