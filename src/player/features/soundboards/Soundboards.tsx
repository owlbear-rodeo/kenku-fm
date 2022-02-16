import React, { useState } from "react";
import { v4 as uuid } from "uuid";

import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import AddRounded from "@mui/icons-material/AddCircleRounded";
import Tooltip from "@mui/material/Tooltip";
import Backdrop from "@mui/material/Backdrop";
import Back from "@mui/icons-material/ChevronLeftRounded";
import styled from "@mui/material/styles/styled";

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
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

import { SoundboardItem } from "./SoundboardItem";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  moveSoundboard,
  Sound,
  addSoundboard,
  addSounds,
} from "./soundboardsSlice";
import { SoundboardAdd } from "./SoundboardAdd";
import { SortableItem } from "../../common/SortableItem";
import { useDrop } from "../../common/useDrop";
import { getRandomBackground } from "../../backgrounds";
import { useHideScrollbar } from "../../../renderer/common/useHideScrollbar";
import { useNavigate } from "react-router-dom";

const WallPaper = styled("div")({
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  background: "linear-gradient(#2D3143 0%, #1e2231 100%)",
  zIndex: -1,
});

type SoundboardProps = {
  onPlay: (sound: Sound) => void;
};

export function Soundboards({ onPlay }: SoundboardProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const soundboards = useSelector((state: RootState) => state.soundboards);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 10 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const items = soundboards.soundboards.allIds.map(
    (id) => soundboards.soundboards.byId[id]
  );

  const [dragId, setDragId] = useState<string | null>(null);
  function handleDragStart(event: DragStartEvent) {
    setDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over.id) {
      dispatch(moveSoundboard({ active: active.id, over: over.id }));
    }

    setDragId(null);
  }

  const [addOpen, setAddOpen] = useState(false);

  const { dragging, containerListeners, overlayListeners } = useDrop(
    (directories) => {
      for (let directory of Object.values(directories)) {
        const files = directory.audioFiles;
        if (files.length > 0 && directory.path !== "/") {
          const id = uuid();
          dispatch(
            addSoundboard({
              id,
              background: getRandomBackground(),
              title: directory.name,
              sounds: [],
            })
          );
          dispatch(
            addSounds({
              sounds: files.map((file) => ({
                ...file,
                loop: false,
                volume: 1,
                fadeIn: 100,
                fadeOut: 100,
              })),
              soundboardId: id,
            })
          );
        }
      }
    }
  );

  const hideScrollbar = useHideScrollbar();

  return (
    <>
      <WallPaper />
      <Container
        sx={{
          padding: "0px !important",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
        {...containerListeners}
      >
        <Stack
          p={4}
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <IconButton onClick={() => navigate(-1)} sx={{ mr: "40px" }}>
            <Back />
          </IconButton>
          <Typography variant="h3" noWrap>
            Soundboards
          </Typography>
          <Tooltip title="Add Soundboard">
            <IconButton onClick={() => setAddOpen(true)}>
              <AddRounded />
            </IconButton>
          </Tooltip>
        </Stack>
        <Grid
          container
          spacing={2}
          columns={{ xs: 4, sm: 9, md: 12 }}
          sx={{
            px: 2,
            pb: "248px",
            overflowY: "auto",
            maskImage:
              "linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)",
          }}
          {...hideScrollbar}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items} strategy={rectSortingStrategy}>
              {items.map((soundboard) => (
                <Grid item xs={2} sm={3} md={3} key={soundboard.id}>
                  <SortableItem id={soundboard.id}>
                    <SoundboardItem
                      soundboard={soundboard}
                      onSelect={(id) => navigate(`/soundboards/${id}`)}
                      onPlay={onPlay}
                    />
                  </SortableItem>
                </Grid>
              ))}
              <DragOverlay>
                {dragId ? (
                  <SoundboardItem
                    soundboard={soundboards.soundboards.byId[dragId]}
                    onSelect={() => {}}
                    onPlay={() => {}}
                  />
                ) : null}
              </DragOverlay>
            </SortableContext>
          </DndContext>
        </Grid>
        <Backdrop
          open={dragging}
          sx={{ zIndex: 100, bgcolor: "rgba(0, 0, 0, 0.8)" }}
          {...overlayListeners}
        >
          <Typography sx={{ pointerEvents: "none" }}>
            Drop the soundboards here...
          </Typography>
        </Backdrop>
      </Container>
      <SoundboardAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
