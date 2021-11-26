import React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { useDispatch } from "react-redux";
import { editPlaylist, Playlist } from "./playlistsSlice";

type PlaylistSettingsProps = {
  playlist: Playlist;
  open: boolean;
  onClose: () => void;
};

export function PlaylistSettings({
  playlist,
  open,
  onClose,
}: PlaylistSettingsProps) {
  const dispatch = useDispatch();

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editPlaylist({ id: playlist.id, title: event.target.value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Playlist</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            margin="dense"
            id="name"
            label="Name"
            fullWidth
            variant="standard"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={playlist.title}
            onChange={handleTitleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit">Done</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
