import React from "react";
import Stack from "@material-ui/core/Stack";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/AddRounded";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { addItem } from "./playlistSlice";

import { PlaylistItem } from "./PlaylistItem";

export function Playlist() {
  const playlist = useSelector((state: RootState) => state.playlist);
  const dispatch = useDispatch();

  return (
    <Stack direction="column" spacing={1}>
      {playlist.order.map((id) => (
        <PlaylistItem key={id} item={playlist.items[id]} />
      ))}
      <Stack direction="row" sx={{ justifyContent: "center" }}>
        <IconButton onClick={() => dispatch(addItem())}>
          <AddIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
