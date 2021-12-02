import React, { useState } from "react";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import AddRounded from "@mui/icons-material/AddRounded";
import Tooltip from "@mui/material/Tooltip";

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

import { PlaylistItem } from "./PlaylistItem";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectPlaylist, movePlaylist, Track } from "./playlistsSlice";
import { PlaylistAdd } from "./PlaylistAdd";
import { SortableItem } from "./SortableItem";
import { startQueue } from "../playback/playbackSlice";

type PlaylistsProps = {
  onPlay: (track: Track) => void;
};

export function Playlists({ onPlay }: PlaylistsProps) {
  const dispatch = useDispatch();
  const playlists = useSelector((state: RootState) => state.playlists);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 10 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const items = playlists.playlists.allIds.map(
    (id) => playlists.playlists.byId[id]
  );

  const [dragId, setDragId] = useState<string | null>(null);
  function handleDragStart(event: DragStartEvent) {
    setDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over.id) {
      dispatch(movePlaylist({ active: active.id, over: over.id }));
    }

    setDragId(null);
  }

  const [addOpen, setAddOpen] = useState(false);

  function handlePlaylistPlay(playlistId: string) {
    const playlist = playlists.playlists.byId[playlistId];
    if (playlist) {
      let tracks = [...playlist.tracks];
      const trackId = tracks[0];
      const track = playlists.tracks[trackId];
      if (track) {
        dispatch(startQueue({ tracks, trackId, playlistId }));
        onPlay(track);
      }
    }
  }

  return (
    <Container
      sx={{
        padding: "0px !important",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <Stack
        p={4}
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="h3">Playlists</Typography>
        <Tooltip title="Add Playlist">
          <IconButton onClick={() => setAddOpen(true)}>
            <AddRounded />
          </IconButton>
        </Tooltip>
      </Stack>
      <Grid
        container
        spacing={{ xs: 2, md: 3 }}
        columns={{ xs: 4, sm: 9, md: 12, lg: 10 }}
        sx={{
          px: 2,
          pb: "143px",
          overflowY: "auto",
          maskImage:
            "linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={rectSortingStrategy}>
            {items.map((playlist) => (
              <Grid item xs={2} sm={3} md={3} lg={2} key={playlist.id}>
                <SortableItem id={playlist.id}>
                  <PlaylistItem
                    playlist={playlist}
                    onSelect={(id) => dispatch(selectPlaylist(id))}
                    onPlay={handlePlaylistPlay}
                  />
                </SortableItem>
              </Grid>
            ))}
            <DragOverlay>
              {dragId ? (
                <PlaylistItem
                  playlist={playlists.playlists.byId[dragId]}
                  onSelect={() => {}}
                  onPlay={() => {}}
                />
              ) : null}
            </DragOverlay>
          </SortableContext>
        </DndContext>
      </Grid>
      <PlaylistAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </Container>
  );
}
