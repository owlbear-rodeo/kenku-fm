import React, { useState } from "react";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";

import ExpandLess from "@mui/icons-material/ExpandLessRounded";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import AddIcon from "@mui/icons-material/AddRounded";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { moveApp } from "./appsSlice";

import { AppListItem } from "./AppListItem";
import { AppAdd } from "./AppAdd";
import { PlayerListItem } from "../player/PlayerListItem";
import { SortableItem } from "./SortableItem";

export function AppListItems() {
  const dispatch = useDispatch();

  const apps = useSelector((state: RootState) => state.apps);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 10 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const [open, setOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  function toggleOpen() {
    setOpen(!open);
  }

  const items = apps.apps.allIds.map((id) => apps.apps.byId[id]);

  const [dragId, setDragId] = useState<string | null>(null);
  function handleDragStart(event: DragStartEvent) {
    setDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over.id) {
      dispatch(moveApp({ active: active.id, over: over.id }));
    }

    setDragId(null);
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
      <Collapse in={open} timeout="auto">
        <List component="div" disablePadding>
          <PlayerListItem />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items}
              strategy={verticalListSortingStrategy}
            >
              {items.map((app) => (
                <SortableItem key={app.id} id={app.id}>
                  <AppListItem
                    app={app}
                    selected={apps.selectedApp === app.id}
                  />
                </SortableItem>
              ))}
              <DragOverlay>
                {dragId ? (
                  <AppListItem
                    app={apps.apps.byId[dragId]}
                    selected={apps.selectedApp === dragId}
                    shadow
                  />
                ) : null}
              </DragOverlay>
            </SortableContext>
          </DndContext>
        </List>
      </Collapse>
      <AppAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
