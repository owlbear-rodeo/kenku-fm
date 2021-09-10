import React, { useState } from "react";
import {
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
} from "@material-ui/core";
import ExpandLess from "@material-ui/icons/ExpandLessRounded";
import ExpandMore from "@material-ui/icons/ExpandMoreRounded";
import AddIcon from "@material-ui/icons/AddRounded";

import { RootState } from "../../app/store";
import { useSelector } from "react-redux";

import { AppListItem } from "./AppListItem";
import { AppAdd } from "./AppAdd";

export function AppListItems() {
  const apps = useSelector((state: RootState) => state.apps);

  const [open, setOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  function toggleOpen() {
    setOpen(!open);
  }

  return (
    <>
      <ListItemButton onClick={toggleOpen}>
        <ListItemText primary="Apps" />
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setAddOpen(true);
          }}
        >
          <AddIcon />
        </IconButton>
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {apps.apps.allIds.map((id) => (
            <AppListItem
              app={apps.apps.byId[id]}
              selected={apps.selectedApp === id}
              key={id}
            />
          ))}
        </List>
      </Collapse>
      <AppAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
