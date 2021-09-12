import React, { useEffect } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Stack from "@material-ui/core/Stack";
import Link from "@material-ui/core/Link";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setStatus } from "../connection/connectionSlice";
import { setDiscordToken } from "./settingsSlice";

type SettingsProps = {
  open: boolean;
  onClose: () => void;
};

export function Settings({ open, onClose }: SettingsProps) {
  const connection = useSelector((state: RootState) => state.connection);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();

  function handleDiscordTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(setDiscordToken(e.target.value));
  }

  function handleDiscordConnect() {
    if (connection.status === "disconnected") {
      dispatch(setStatus("connecting"));
      window.kenku.connect(settings.discordToken);
    } else {
      window.kenku.disconnect();
    }
  }

  useEffect(() => {
    if (settings.discordToken) {
      dispatch(setStatus("connecting"));
      window.kenku.connect(settings.discordToken);
    }
    return () => {
      window.kenku.disconnect();
    };
  }, []);

  useEffect(() => {
    window.kenku.on("ready", () => {
      dispatch(setStatus("ready"));
    });
    window.kenku.on("disconnect", () => {
      dispatch(setStatus("disconnected"));
    });

    return () => {
      window.kenku.removeAllListeners("ready");
      window.kenku.removeAllListeners("disconnect");
    };
  }, [dispatch]);

  return (
    <Dialog fullScreen sx={{ width: 240 }} open={open} onClose={onClose}>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
      <DialogTitle>Connection</DialogTitle>
      <DialogContent>
        <DialogContentText>Enter your bot's token</DialogContentText>
        <Stack spacing={1}>
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
          <Button
            disabled={
              connection.status === "connecting" || !settings.discordToken
            }
            onClick={handleDiscordConnect}
            fullWidth
            variant="outlined"
          >
            {connection.status === "connecting" ? (
              <CircularProgress size={24} />
            ) : connection.status === "ready" ? (
              "Disconnect"
            ) : (
              "Connect"
            )}
          </Button>
          <Link
            href="https://discord.com/developers/applications"
            variant="caption"
            textAlign="center"
            target="_blank"
            rel="noopener noreferrer"
            py={2}
          >
            Where do I get my token?
          </Link>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
