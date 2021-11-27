import React, { useCallback } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

import { useDropzone } from "react-dropzone";

import { useDispatch } from "react-redux";
import { editTrack, Track } from "./playlistsSlice";

import { getDropURL, encodeFilePath } from "../../common/drop";

type TrackSettingsProps = {
  track: Track;
  open: boolean;
  onClose: () => void;
};

export function TrackSettings({ track, open, onClose }: TrackSettingsProps) {
  const dispatch = useDispatch();

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editTrack({ id: track.id, title: event.target.value }));
  }

  function handleURLChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editTrack({ id: track.id, url: event.target.value }));
  }

  function handleURLDrop(event: React.DragEvent<HTMLInputElement>) {
    event.preventDefault();
    const url = getDropURL(event.dataTransfer);
    if (url) {
      dispatch(editTrack({ id: track.id, url }));
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onClose();
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      dispatch(editTrack({ id: track.id, url: encodeFilePath(file.path) }));
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "audio/*",
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Track</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="url"
            label="Source"
            placeholder="Enter a URL or select a file below"
            fullWidth
            variant="standard"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={track.url}
            onChange={handleURLChange}
            onDrop={handleURLDrop}
          />
          <Button
            sx={{
              p: 2,
              borderStyle: "dashed",
              my: 1,
            }}
            variant="outlined"
            fullWidth
            {...getRootProps()}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <Typography variant="caption">Drop the files here ...</Typography>
            ) : (
              <Typography variant="caption">
                Drag and drop or click to select files
              </Typography>
            )}
          </Button>
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
            value={track.title}
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
