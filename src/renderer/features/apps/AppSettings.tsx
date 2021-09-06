import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import { useDispatch } from 'react-redux';
import { App, editApp } from './appsSlice';

type AppSettingsProps = {
  app: App;
  open: boolean;
  onClose: () => void;
};

export function AppSettings({ app, open, onClose }: AppSettingsProps) {
  const dispatch = useDispatch();

  function handleURLChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editApp({ id: app.id, url: event.target.value }));
  }

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editApp({ id: app.id, title: event.target.value }));
  }

  function handleClose() {
    window.kenku.appIcon(app.url).then((icon) => {
      dispatch(editApp({ id: app.id, icon }));
    });
    onClose();
  }

  return (
    <Dialog fullScreen sx={{ width: 240 }} open={open} onClose={handleClose}>
      <DialogTitle>Edit App</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="url"
          label="URL"
          fullWidth
          variant="outlined"
          autoComplete="off"
          InputLabelProps={{
            shrink: true,
          }}
          value={app.url}
          onChange={handleURLChange}
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
          value={app.title}
          onChange={handleTitleChange}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
