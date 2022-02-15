import React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import FormHelperText from "@mui/material/FormHelperText";

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

  function handleFadeInChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    dispatch(editSound({ id: sound.id, fadeIn: isNaN(num) ? 0 : num }));
  }

  function handleFadeOutChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    dispatch(editSound({ id: sound.id, fadeOut: isNaN(num) ? 0 : num }));
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
          <Box sx={{ display: "flex", gap: 1, my: 1 }}>
            <FormControl variant="standard" fullWidth>
              <FormHelperText id="fade-in-helper-text">Fade In</FormHelperText>
              <Input
                margin="dense"
                fullWidth
                autoComplete="off"
                id="fade-in"
                value={`${sound.fadeIn}`}
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
                value={`${sound.fadeOut}`}
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
          <Button type="submit">Done</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
