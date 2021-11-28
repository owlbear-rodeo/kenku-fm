import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { v4 as uuid } from "uuid";

import { useDispatch } from "react-redux";
import { addTrack } from "./playlistsSlice";
import { AudioSelector } from "./AudioSelector";
import { addTrackToQueueIfNeeded } from "../playback/playbackSlice";

type TrackAddProps = {
  playlistId: string;
  open: boolean;
  onClose: () => void;
};

export function TrackAdd({ playlistId, open, onClose }: TrackAddProps) {
  const dispatch = useDispatch();

  const [title, setTitle] = useState("");
  const [url, setURL] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setURL("");
    }
  }, [open]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const id = uuid();
    dispatch(addTrack({ track: { id, title, url }, playlistId }));
    dispatch(addTrackToQueueIfNeeded({ playlistId, trackId: id }));
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Track</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <AudioSelector value={url} onChange={setURL} />
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
            value={title}
            onChange={handleTitleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!title || !url} type="submit">
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
