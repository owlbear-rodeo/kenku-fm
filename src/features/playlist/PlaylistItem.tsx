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

  function handleItemRemove() {
    dispatch(removeItem(item.id));
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
        <IconButton>
          <PlayIcon />
        </IconButton>
        <IconButton onClick={handleItemRemove}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
