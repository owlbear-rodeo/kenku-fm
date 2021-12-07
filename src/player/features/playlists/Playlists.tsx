import React, { useState } from "react";
import { v4 as uuid } from "uuid";

import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import AddRounded from "@mui/icons-material/AddRounded";
import Tooltip from "@mui/material/Tooltip";
import Backdrop from "@mui/material/Backdrop";

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
import {
  selectPlaylist,
  movePlaylist,
  Track,
  addPlaylist,
  addTracks,
} from "./playlistsSlice";
import { PlaylistAdd } from "./PlaylistAdd";
import { SortableItem } from "./SortableItem";
import { startQueue } from "../playback/playbackSlice";
import { useDrop } from "./useDrop";
import { getRandomBackground } from "../../backgrounds";
import { useHideScrollbar } from "../../../renderer/common/useHideScrollbar";

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

  const { dragging, containerListeners, overlayListeners } = useDrop(
    (directories) => {
      for (let directory of Object.values(directories)) {
        const tracks = directory.tracks;
        if (tracks.length > 0 && directory.path !== "/") {
          const id = uuid();
          dispatch(
            addPlaylist({
              id,
              background: getRandomBackground(),
              title: directory.name,
              tracks: [],
            })
          );
          dispatch(addTracks({ tracks, playlistId: id }));
        }
      }
    }
  );

  const hideScrollbar = useHideScrollbar();

  return (
    <>
      <Container
        sx={{
          padding: "0px !important",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
        {...containerListeners}
      >
        <Stack
          p={4}
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h3" noWrap>
            Playlists
          </Typography>
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
        <Backdrop
          open={dragging}
          sx={{ zIndex: 100, bgcolor: "rgba(0, 0, 0, 0.8)" }}
          {...overlayListeners}
        >
          <Typography sx={{ pointerEvents: "none" }}>
            Drop the playlists here...
          </Typography>
        </Backdrop>
      </Container>
      <PlaylistAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
