import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

import { useDispatch } from "react-redux";
import { Bookmark, editBookmark } from "./bookmarksSlice";

import { getDropURL } from "../../common/drop";

type BookmarkSettingsProps = {
  bookmark: Bookmark;
  open: boolean;
  onClose: () => void;
};

export function BookmarkSettings({
  bookmark,
  open,
  onClose,
}: BookmarkSettingsProps) {
  const dispatch = useDispatch();

  function handleURLChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editBookmark({ id: bookmark.id, url: event.target.value }));
  }

  function handleURLDrop(event: React.DragEvent<HTMLInputElement>) {
    event.preventDefault();
    const url = getDropURL(event.dataTransfer);
    if (url) {
      dispatch(editBookmark({ id: bookmark.id, url }));
    }
  }

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editBookmark({ id: bookmark.id, title: event.target.value }));
  }

  function handleClose() {
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    handleClose();
  }

  return (
    <Dialog
      fullScreen
      sx={{ width: 240 }}
      open={open}
      onClose={handleClose}
      // Stop key events from propagating to prevent the track drag and drop from stealing the space bar
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <DialogTitle
        sx={{
          textAlign: window.kenku.platform !== "win32" ? "right" : "left",
          py: window.kenku.platform !== "win32" ? 1.5 : 2,
        }}
      >
        Edit Bookmark
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="url"
            label="URL"
            fullWidth
            variant="standard"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={bookmark.url}
            onChange={handleURLChange}
            onDrop={handleURLDrop}
          />
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
            value={bookmark.title}
            onChange={handleTitleChange}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button type="submit">Done</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
