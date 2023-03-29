import React, { useEffect, useState } from "react";

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
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setStatus } from "../connection/connectionSlice";
import {
  setDiscordToken,
  setExternalInputsEnabled,
  setMultipleInputsEnabled,
  setMultipleOutputsEnabled,
  setRemoteEnabled,
  setRemoteAddress,
  setRemotePort,
  setURLBarEnabled,
  setStreamingMode,
  StreamingMode,
} from "./settingsSlice";

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

  const discordSettings = (
    <Stack spacing={1}>
      <TextField
        autoFocus
        margin="dense"
        size="small"
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
        helperText="Enter your bot's token"
      />
      <Button
        disabled={connection.status === "connecting" || !settings.discordToken}
        onClick={handleDiscordConnect}
        fullWidth
        variant="outlined"
        size="small"
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
  );

  function handleRemoteToggle() {
    const enabled = !settings.remoteEnabled;
    if (enabled) {
      window.kenku.playerStartRemote(
        settings.remoteAddress,
        settings.remotePort
      );
    } else {
      window.kenku.playerStopRemote();
    }
    dispatch(setRemoteEnabled(enabled));
  }

  function handleRemoteAddressChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    dispatch(setRemoteAddress(event.target.value));
  }

  function handleRemotePortChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(setRemotePort(event.target.value));
  }

  useEffect(() => {
    if (settings.remoteEnabled) {
      window.kenku.playerStartRemote(
        settings.remoteAddress,
        settings.remotePort
      );
    }
  }, []);

  const remoteSettings = (
    <Stack spacing={1}>
      <Stack direction="row">
        <TextField
          margin="dense"
          size="small"
          id="remote-address"
          label="Address"
          variant="standard"
          autoComplete="off"
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{ pattern: "d{1,3}.d{1,3}.d{1,3}.d{1,3}" }}
          value={settings.remoteAddress}
          onChange={handleRemoteAddressChange}
          disabled={settings.remoteEnabled}
          sx={{ mr: 0.5 }}
        />
        <TextField
          margin="dense"
          size="small"
          id="remote-port"
          label="Port"
          variant="standard"
          autoComplete="off"
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{ pattern: "d+" }}
          value={settings.remotePort}
          onChange={handleRemotePortChange}
          disabled={settings.remoteEnabled}
          sx={{ ml: 0.5 }}
        />
      </Stack>
      <Button
        onClick={handleRemoteToggle}
        fullWidth
        variant="outlined"
        size="small"
        disabled={!settings.remoteAddress || !settings.remotePort}
      >
        {settings.remoteEnabled ? "Stop Remote" : "Start Remote"}
      </Button>
      <Link
        href="https://www.kenku.fm/docs/using-kenku-remote"
        variant="caption"
        textAlign="center"
        target="_blank"
        rel="noopener noreferrer"
        py={2}
      >
        What is Kenku Remote?
      </Link>
    </Stack>
  );

  const [streamingModeChanged, setStreamingModeChanged] = useState(false);

  function handleStreamingModeChnage(event: SelectChangeEvent) {
    dispatch(setStreamingMode(event.target.value as StreamingMode));
    setStreamingModeChanged(true);
  }

  useEffect(() => {
    window.kenku.startAudioCapture(settings.streamingMode);
  }, []);

  const streamingSettings = (
    <FormControl fullWidth variant="standard" margin="dense">
      <InputLabel id="streaming-mode-select-label">Mode</InputLabel>
      <Select
        labelId="streaming-mode-select-label"
        label="Mode"
        value={settings.streamingMode}
        onChange={handleStreamingModeChnage}
      >
        <MenuItem value="lowLatency">Low Latency</MenuItem>
        <MenuItem value="performance">Performance</MenuItem>
      </Select>
      {streamingModeChanged && (
        <FormHelperText sx={{ color: "primary.main" }}>
          * Restart to apply change
        </FormHelperText>
      )}
    </FormControl>
  );

  function handleShowControlsToggle() {
    dispatch(setURLBarEnabled(!settings.urlBarEnabled));
  }

  function handleExternalInputsToggle() {
    dispatch(setExternalInputsEnabled(!settings.externalInputsEnabled));
  }

  function handleMultipleInputsToggle() {
    dispatch(setMultipleInputsEnabled(!settings.multipleInputsEnabled));
  }

  function handleMultipleOutputsToggle() {
    dispatch(setMultipleOutputsEnabled(!settings.multipleOutputsEnabled));
  }

  const [clearingCache, setClearingCache] = useState(false);
  async function handleCacheClear() {
    setClearingCache(true);
    await window.kenku.clearCache();
    setClearingCache(false);
  }

  const otherSettings = (
    <Stack spacing={1}>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={settings.urlBarEnabled}
              onChange={handleShowControlsToggle}
            />
          }
          sx={{ marginLeft: "-8px" }}
          label={<Typography variant="caption">Show Tab URL Bar</Typography>}
        />
      </FormGroup>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={settings.multipleOutputsEnabled}
              onChange={handleMultipleOutputsToggle}
            />
          }
          sx={{ marginLeft: "-8px" }}
          label={<Typography variant="caption">Multiple Outputs</Typography>}
        />
      </FormGroup>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={settings.externalInputsEnabled}
              onChange={handleExternalInputsToggle}
            />
          }
          sx={{ marginLeft: "-8px" }}
          label={<Typography variant="caption">External Inputs</Typography>}
        />
      </FormGroup>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={settings.multipleInputsEnabled}
              onChange={handleMultipleInputsToggle}
            />
          }
          disabled={!settings.externalInputsEnabled}
          sx={{ marginLeft: "-8px" }}
          label={
            <Typography
              variant="caption"
              sx={{ opacity: settings.externalInputsEnabled ? undefined : 0.5 }}
            >
              Multiple Inputs
            </Typography>
          }
        />
      </FormGroup>
      <Button
        onClick={handleCacheClear}
        fullWidth
        variant="outlined"
        size="small"
      >
        {clearingCache ? <CircularProgress size={24} /> : "Clear Cache"}
      </Button>
    </Stack>
  );

  return (
    <Dialog fullScreen sx={{ width: 240 }} open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          textAlign: window.kenku.platform !== "win32" ? "right" : "left",
          py: window.kenku.platform !== "win32" ? 1.5 : 2,
        }}
      >
        Settings
      </DialogTitle>
      <DialogContent>
        <DialogContentText>Discord</DialogContentText>
        {discordSettings}
        <Divider sx={{ mb: 2 }} />
        <DialogContentText>Remote</DialogContentText>
        {remoteSettings}
        <Divider sx={{ mb: 2 }} />
        <DialogContentText>Streaming</DialogContentText>
        {streamingSettings}
        <Divider sx={{ mb: 2 }} />
        <DialogContentText>Other</DialogContentText>
        {otherSettings}
        <Stack my={1}>
          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            v{window.kenku.version}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
