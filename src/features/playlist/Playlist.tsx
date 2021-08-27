import React from "react";
import Stack from "@material-ui/core/Stack";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/AddRounded";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { addItem, editItem } from "./playlistSlice";

import { PlaylistItem } from "./PlaylistItem";
import { useEffect } from "react";

export function Playlist() {
  const playlist = useSelector((state: RootState) => state.playlist);
  const dispatch = useDispatch();

  useEffect(() => {
    window.discord.on("info", (args) => {
      const title = args[0];
      const id = args[1];
      dispatch(editItem({ id, title }));
    });
    window.discord.on("validation", (args) => {
      const valid = args[0];
      const id = args[1];
      dispatch(editItem({ id, state: valid ? "valid" : "invalid" }));
    });

    return () => {
      window.discord.removeAllListeners("info");
      window.discord.removeAllListeners("validation");
    };
  }, [dispatch]);

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
