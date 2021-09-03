import React, { useState, useEffect } from 'react';
import IconButton from '@material-ui/core/IconButton';
import LinkIcon from '@material-ui/icons/LinkRounded';
import LinkOffIcon from '@material-ui/icons/LinkOffRounded';
import SettingsIcon from '@material-ui/icons/SettingsRounded';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Stack from '@material-ui/core/Stack';

import { RootState } from '../../app/store';
import { useSelector, useDispatch } from 'react-redux';
import { setStatus } from '../connection/connectionSlice';
import { setDiscordToken } from './settingsSlice';

export function Settings() {
  const connection = useSelector((state: RootState) => state.connection);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleDiscordTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(setDiscordToken(e.target.value));
  }

  function handleDiscordConnect() {
    if (connection.status === 'disconnected') {
      dispatch(setStatus('connecting'));
      window.discord.connect(settings.discordToken);
    } else {
      dispatch(setStatus('disconnected'));
      window.discord.disconnect();
    }
  }

  useEffect(() => {
    if (settings.discordToken) {
      dispatch(setStatus('connecting'));
      window.discord.connect(settings.discordToken);
    }
  }, []);

  useEffect(() => {
    window.discord.on('ready', () => {
      dispatch(setStatus('ready'));
    });
    window.discord.on('disconnect', () => {
      dispatch(setStatus('disconnected'));
    });

    return () => {
      window.discord.removeAllListeners('ready');
      window.discord.removeAllListeners('disconnect');
    };
  }, [dispatch]);

  return (
    <div>
      <IconButton onClick={handleOpen}>
        <SettingsIcon />
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Connection</DialogTitle>
        <DialogContent>
          <DialogContentText>Enter your bot's token</DialogContentText>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
            <TextField
              autoFocus
              margin="dense"
              id="token"
              label="Token"
              type="password"
              fullWidth
              variant="standard"
              autoComplete="off"
              value={settings.discordToken}
              onChange={handleDiscordTokenChange}
            />
            <IconButton onClick={handleDiscordConnect}>
              {connection.status === 'connecting' ? (
                <CircularProgress size={24} />
              ) : connection.status === 'ready' ? (
                <LinkIcon />
              ) : (
                <LinkOffIcon />
              )}
            </IconButton>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
