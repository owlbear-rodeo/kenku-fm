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
import { moveBookmark } from "./bookmarksSlice";

import { BookmarkListItem } from "./BookmarkListItem";
import { AddBookmark } from "./AddBookmark";
import { PlayerListItem } from "../player/PlayerListItem";
import { SortableItem } from "./SortableItem";

export function BookmarkListItems() {
  const dispatch = useDispatch();

  const bookmarks = useSelector((state: RootState) => state.bookmarks);

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

  const items = bookmarks.bookmarks.allIds.map(
    (id) => bookmarks.bookmarks.byId[id]
  );

  const [dragId, setDragId] = useState<string | null>(null);
  function handleDragStart(event: DragStartEvent) {
    setDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over.id) {
      dispatch(moveBookmark({ active: active.id, over: over.id }));
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
              {items.map((bookmark) => (
                <SortableItem key={bookmark.id} id={bookmark.id}>
                  <BookmarkListItem
                    bookmark={bookmark}
                    selected={bookmarks.selectedBookmark === bookmark.id}
                  />
                </SortableItem>
              ))}
              <DragOverlay>
                {dragId ? (
                  <BookmarkListItem
                    bookmark={bookmarks.bookmarks.byId[dragId]}
                    selected={bookmarks.selectedBookmark === dragId}
                    shadow
                  />
                ) : null}
              </DragOverlay>
            </SortableContext>
          </DndContext>
        </List>
      </Collapse>
      <AddBookmark open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
