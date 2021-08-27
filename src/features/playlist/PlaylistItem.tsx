import React, { useEffect } from "react";
import Stack from "@material-ui/core/Stack";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import PlayIcon from "@material-ui/icons/PlayArrowRounded";
import DeleteIcon from "@material-ui/icons/DeleteRounded";

import { useDispatch } from "react-redux";
import { removeItem, editItem, PlaylistItem } from "./playlistSlice";
import { useDebounce } from "../../common/useDebounce";

type PlaylistItemProps = {
  item: PlaylistItem;
};

export function PlaylistItem({ item }: PlaylistItemProps) {
  const dispatch = useDispatch();

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editItem({ id: item.id, url: e.target.value, state: "unknown" }));
  }

  function handleRemove() {
    dispatch(removeItem(item.id));
  }

  function handlePlay() {
    window.discord.play(item.url);
  }

  const debouncedItem = useDebounce(item, 1000);
  useEffect(() => {
    window.discord.validateUrl(debouncedItem.url, debouncedItem.id);
    window.discord.getInfo(debouncedItem.url, debouncedItem.id);
  }, [debouncedItem]);

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
          helperText={item.title}
          error={!!item.url && item.state === "invalid"}
        />
        <IconButton
          onClick={handlePlay}
          disabled={!item.url || item.state !== "valid"}
        >
          <PlayIcon />
        </IconButton>
        <IconButton onClick={handleRemove}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
