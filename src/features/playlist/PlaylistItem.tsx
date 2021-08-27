import React from "react";
import Stack from "@material-ui/core/Stack";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import PlayIcon from "@material-ui/icons/PlayArrowRounded";
import DeleteIcon from "@material-ui/icons/DeleteRounded";

import { useDispatch } from "react-redux";
import { removeItem, editItem, PlaylistItem } from "./playlistSlice";

type PlaylistItemProps = {
  item: PlaylistItem;
};

export function PlaylistItem({ item }: PlaylistItemProps) {
  const dispatch = useDispatch();

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editItem({ id: item.id, url: e.target.value }));
  }

  function handleRemove() {
    dispatch(removeItem(item.id));
  }

  function handlePlay() {
    window.discord.play(item.url);
  }

  return (
    <Paper sx={{ p: 1 }}>
      <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
        <TextField
          value={item.url}
          onChange={handleUrlChange}
          sx={{ flexGrow: 1 }}
          variant="outlined"
          label="url"
          InputLabelProps={{
            shrink: true,
          }}
          size="small"
        />
        <IconButton onClick={handlePlay} disabled={!item.url}>
          <PlayIcon />
        </IconButton>
        <IconButton onClick={handleRemove}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
