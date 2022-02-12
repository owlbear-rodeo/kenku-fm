import React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { useDispatch } from "react-redux";
import { editSound, Sound } from "./soundboardsSlice";
import { AudioSelector } from "../../common/AudioSelector";

type SoundSettingsProps = {
  sound: Sound;
  open: boolean;
  onClose: () => void;
};

export function SoundSettings({ sound, open, onClose }: SoundSettingsProps) {
  const dispatch = useDispatch();

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editSound({ id: sound.id, title: event.target.value }));
  }

  function handleURLChange(url: string) {
    dispatch(editSound({ id: sound.id, url }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Stop key events from propagating to prevent the sound drag and drop from stealing the space bar
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DialogTitle>Edit Sound</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <AudioSelector value={sound.url} onChange={handleURLChange} />
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
            value={sound.title}
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
