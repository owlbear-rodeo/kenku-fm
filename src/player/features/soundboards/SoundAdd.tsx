import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import FormHelperText from "@mui/material/FormHelperText";

import { v4 as uuid } from "uuid";

import { useDispatch } from "react-redux";
import { addSound } from "./soundboardsSlice";
import { AudioSelector } from "../../common/AudioSelector";

type SoundAddProps = {
  soundboardId: string;
  open: boolean;
  onClose: () => void;
};

export function SoundAdd({ soundboardId, open, onClose }: SoundAddProps) {
  const dispatch = useDispatch();

  const [title, setTitle] = useState("");
  const [url, setURL] = useState("");
  const [fadeIn, setFadeIn] = useState(100);
  const [fadeOut, setFadeOut] = useState(100);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setURL("");
    }
  }, [open]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handleFadeInChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    setFadeIn(isNaN(num) ? 0 : num);
  }

  function handleFadeOutChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    setFadeOut(isNaN(num) ? 0 : num);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const id = uuid();
    dispatch(
      addSound({
        sound: { id, title, url, loop: false, volume: 1, fadeIn, fadeOut },
        soundboardId: soundboardId,
      })
    );
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Sound</DialogTitle>
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
          <Box sx={{ display: "flex", gap: 1, my: 1 }}>
            <FormControl variant="standard" fullWidth>
              <FormHelperText id="fade-in-helper-text">Fade In</FormHelperText>
              <Input
                margin="dense"
                fullWidth
                autoComplete="off"
                id="fade-in"
                value={`${fadeIn}`}
                onChange={handleFadeInChange}
                endAdornment={
                  <InputAdornment position="end">ms</InputAdornment>
                }
                aria-describedby="fade-in-helper-text"
                inputProps={{
                  "aria-label": "fade in",
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
              />
            </FormControl>
            <FormControl variant="standard" fullWidth>
              <FormHelperText id="fade-out-helper-text">
                Fade Out
              </FormHelperText>
              <Input
                margin="dense"
                fullWidth
                autoComplete="off"
                id="fade-out"
                value={`${fadeOut}`}
                onChange={handleFadeOutChange}
                endAdornment={
                  <InputAdornment position="end">ms</InputAdornment>
                }
                aria-describedby="fade-out-helper-text"
                inputProps={{
                  "aria-label": "fade out",
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
              />
            </FormControl>
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
