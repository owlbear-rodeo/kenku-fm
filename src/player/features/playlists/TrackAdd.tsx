import React, { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import { v4 as uuid } from "uuid";

import { useDispatch } from "react-redux";
import { addTrack, addTracks, Track } from "./playlistsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import { addTrackToQueueIfNeeded, addTracksToQueueIfNeeded } from "./playlistPlaybackSlice";
import useFileDrop, { FileInfo } from "../../common/useFileDrop";
import { encodeFilePath, cleanFileName } from "../../../renderer/common/drop";

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

  const onMultiDrop = useCallback(
    (acceptedFiles: FileInfo[]) => {
      if (acceptedFiles.length === 0) return;
      const tracks: Track[] = acceptedFiles.map((file) => ({
        id: uuid(),
        url: encodeFilePath(file.path),
        title: cleanFileName(file.name),
      }));
      dispatch(addTracks({ tracks, playlistId }));
      dispatch(
        addTracksToQueueIfNeeded({
          playlistId,
          trackIds: tracks.map((t) => t.id),
        })
      );
      onClose();
    },
    [dispatch, playlistId, onClose]
  );

  const {
    rootProps: multiRootProps,
    inputProps: multiInputProps,
    isDragging: multiIsDragging,
  } = useFileDrop({
    onDrop: onMultiDrop,
    accept: "audio/*",
    multiple: true,
  });

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
          <AudioSelector value={url} onChange={setURL} onFileName={setTitle} />
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
          <Box sx={{ mt: 3, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Or upload multiple files
            </Typography>
            <Button
              sx={{
                p: 2,
                borderStyle: "dashed",
                width: "100%",
              }}
              variant="outlined"
              {...multiRootProps}
            >
              <input {...multiInputProps} />
              {multiIsDragging ? (
                <Typography variant="caption">
                  Drop tracks here...
                </Typography>
              ) : (
                <Typography variant="caption">
                  Drag and drop or click to select multiple tracks
                </Typography>
              )}
            </Button>
          </Box>
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
