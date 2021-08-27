import React, { useEffect } from "react";
import Stack from "@material-ui/core/Stack";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/AddRounded";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { addItem, editItem } from "./playlistSlice";

import { PlaylistItem } from "./PlaylistItem";

export function Playlist() {
  const playlist = useSelector((state: RootState) => state.playlist);
  const dispatch = useDispatch();

  useEffect(() => {
    window.discord.on("play", (args) => {
      const id = args[0];
      dispatch(editItem({ id, state: "playing" }));
    });
    window.discord.on("stop", (args) => {
      const id = args[0];
      dispatch(editItem({ id, state: "valid" }));
    });
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
      window.discord.removeAllListeners("play");
      window.discord.removeAllListeners("stop");
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
