import React, { useState, useEffect } from "react";
import IconButton from "@material-ui/core/IconButton";
import LinkIcon from "@material-ui/icons/LinkRounded";
import LinkOffIcon from "@material-ui/icons/LinkOffRounded";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setStatus, setToken } from "./connectionSlice";

export function ConnectionDialog() {
  const connection = useSelector((state: RootState) => state.connection);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    dispatch(setStatus("connecting"));
    window.discord.connect(connection.token);
  }

  function handleTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(setToken(e.target.value));
  }

  useEffect(() => {
    dispatch(setStatus("connecting"));
    window.discord.connect(connection.token);
  }, []);

  useEffect(() => {
    window.discord.on("ready", () => {
      dispatch(setStatus("ready"));
    });
    window.discord.on("disconnect", () => {
      dispatch(setStatus("disconnected"));
    });

    return () => {
      window.discord.removeAllListeners("ready");
      window.discord.removeAllListeners("disconnect");
    };
  }, [dispatch]);

  return (
    <div>
      <IconButton onClick={handleOpen}>
        {connection.status === "connecting" ? (
          <CircularProgress size={24} />
        ) : connection.status === "ready" ? (
          <LinkIcon />
        ) : (
          <LinkOffIcon />
        )}
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Connection</DialogTitle>
        <DialogContent>
          <DialogContentText>Enter your bot's token</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="token"
            label="Token"
            type="password"
            fullWidth
            variant="standard"
            autoComplete="off"
            value={connection.token}
            onChange={handleTokenChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
