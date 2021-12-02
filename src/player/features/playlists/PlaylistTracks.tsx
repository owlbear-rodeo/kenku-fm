import React, { useState } from "react";

import Box from "@mui/material/Box";
import List from "@mui/material/List";

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

import { TrackItem } from "./TrackItem";
import { SortableItem } from "./SortableItem";

import { useDispatch } from "react-redux";
import { Playlist, Track, moveTrack } from "./playlistsSlice";
import { moveQueueIfNeeded, startQueue } from "../playback/playbackSlice";

type PlaylistTracksProps = {
  items: Track[];
  playlist: Playlist;
  onPlay: (id: string) => void;
};

export function PlaylistTracks({
  items,
  playlist,
  onPlay,
}: PlaylistTracksProps) {
  const dispatch = useDispatch();

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 10 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const [dragId, setDragId] = useState<string | null>(null);
  function handleDragStart(event: DragStartEvent) {
    setDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over.id) {
      dispatch(
        moveTrack({ playlistId: playlist.id, active: active.id, over: over.id })
      );
      dispatch(
        moveQueueIfNeeded({
          playlistId: playlist.id,
          active: active.id,
          over: over.id,
        })
      );
    }

    setDragId(null);
  }

  return (
    <Box
      sx={{
        pb: "240px",
        overflowY: "auto",
        maskImage:
          "linear-gradient(to bottom, transparent, black 60px, black calc(100% - 64px), transparent)",
        position: "absolute",
        width: "100%",
        height: "calc(100% - 60px)",
        paddingTop: "60px",
        top: "60px",
      }}
    >
      <List
        sx={{
          width: "100%",
          maxWidth: 360,
          margin: "0 auto",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id}>
                <TrackItem track={item} playlist={playlist} onPlay={onPlay} />
              </SortableItem>
            ))}
            <DragOverlay>
              {dragId ? (
                <TrackItem
                  track={items.find((track) => track.id === dragId)}
                  playlist={playlist}
                  onPlay={onPlay}
                />
              ) : null}
            </DragOverlay>
          </SortableContext>
        </DndContext>
      </List>
    </Box>
  );
}
