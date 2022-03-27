import React, { useState } from "react";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";

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
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { SoundItem } from "./SoundItem";
import { SortableItem } from "../../common/SortableItem";

import { useDispatch } from "react-redux";
import { Soundboard, Sound, moveSound } from "./soundboardsSlice";

import { useHideScrollbar } from "../../../renderer/common/useHideScrollbar";

type SoundboardSoundsProps = {
  soundboard: Soundboard;
  onPlay: (sound: Sound) => void;
  onStop: (id: string) => void;
};

export function SoundboardSounds({
  soundboard,
  onPlay,
  onStop,
}: SoundboardSoundsProps) {
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
        moveSound({
          soundboardId: soundboard.id,
          active: active.id,
          over: over.id,
        })
      );
    }

    setDragId(null);
  }

  const hideScrollbar = useHideScrollbar();

  return (
    <Box
      sx={{
        overflowY: "auto",
        maskImage:
          "linear-gradient(to bottom, transparent, black 60px, black calc(100% - 64px), transparent)",
        position: "absolute",
        width: "100%",
        height: "calc(100% - 60px)",
        pt: "60px",
        top: "60px",
        left: 0,
        px: 2,
      }}
      {...hideScrollbar}
    >
      <Grid
        sx={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          marginBottom: "240px",
        }}
        container
        spacing={2}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={soundboard.sounds}
            strategy={rectSortingStrategy}
          >
            {soundboard.sounds.map((id) => (
              <Grid item xs={6} sm={6} md={4} lg={3} key={id}>
                <SortableItem key={id} id={id}>
                  <SoundItem
                    id={id}
                    soundboard={soundboard}
                    onPlay={onPlay}
                    onStop={onStop}
                  />
                </SortableItem>
              </Grid>
            ))}
            <DragOverlay>
              {dragId ? (
                <SoundItem
                  id={dragId}
                  soundboard={soundboard}
                  onPlay={onPlay}
                  onStop={onStop}
                />
              ) : null}
            </DragOverlay>
          </SortableContext>
        </DndContext>
      </Grid>
    </Box>
  );
}
