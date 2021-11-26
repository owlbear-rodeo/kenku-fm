import React, { useState } from "react";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import AddRounded from "@mui/icons-material/AddRounded";
import Tooltip from "@mui/material/Tooltip";

import { PlaylistItem } from "./PlaylistItem";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectPlaylist } from "./playlistsSlice";
import { PlaylistAdd } from "./PlaylistAdd";

export function Playlists() {
  const dispatch = useDispatch();
  const playlists = useSelector((state: RootState) => state.playlists);

  const items = playlists.playlists.allIds.map(
    (id) => playlists.playlists.byId[id]
  );

  const [addOpen, setAddOpen] = useState(false);

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
        sx={{ px: 2, pb: "143px", overflowY: "auto" }}
      >
        {items.map((playlist) => (
          <Grid item xs={2} sm={3} md={3} lg={2} key={playlist.id}>
            <PlaylistItem
              playlist={playlist}
              onSelect={(id) => dispatch(selectPlaylist(id))}
            />
          </Grid>
        ))}
      </Grid>
      <PlaylistAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </Container>
  );
}
