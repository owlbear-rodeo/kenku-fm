import React, { useEffect, useState, useCallback } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

import { useDropzone } from "react-dropzone";

import { v4 as uuid } from "uuid";

import { useDispatch } from "react-redux";
import { addTrack } from "./playlistsSlice";

import { getDropURL, encodeFilePath } from "../../common/drop";

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

  function handleURLChange(event: React.ChangeEvent<HTMLInputElement>) {
    setURL(event.target.value);
  }

  function handleURLDrop(event: React.DragEvent<HTMLInputElement>) {
    event.preventDefault();
    const url = getDropURL(event.dataTransfer);
    if (url) {
      setURL(url);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const id = uuid();
    dispatch(addTrack({ track: { id, title, url }, playlistId }));
    onClose();
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setURL(encodeFilePath(file.path));
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
            value={url}
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
