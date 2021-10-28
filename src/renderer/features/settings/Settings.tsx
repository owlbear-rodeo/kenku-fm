import React, { useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";

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
    window.kenku.on("DISCORD_READY", () => {
      dispatch(setStatus("ready"));
    });
    window.kenku.on("DISCORD_DISCONNECTED", () => {
      dispatch(setStatus("disconnected"));
    });

    return () => {
      window.kenku.removeAllListeners("DISCORD_READY");
      window.kenku.removeAllListeners("DISCORD_DISCONNECTED");
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
            InputLabelProps={{
              shrink: true,
            }}
            value={settings.discordToken}
            onChange={handleDiscordTokenChange}
            disabled={connection.status !== "disconnected"}
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
            href="https://kenku.fm/docs/getting-a-discord-token"
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
