import React, { useEffect, useRef, useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import type { DiscordConfiguration, DiscordResult, DiscordSnapshot } from "../../../dungeonJockey/contracts/discord";

export function DiscordSettings() {
  const [secret, setSecret] = useState("");
  const [configuration, setConfiguration] = useState<DiscordConfiguration>();
  const [snapshot, setSnapshot] = useState<DiscordSnapshot>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);
  const active = useRef(false);
  const working = useRef(false);
  const revision = useRef(0);

  async function refresh() {
    const current = revision.current;
    try {
      const [config, status] = await Promise.all([window.dungeonJockey.getDiscordConfiguration(), window.dungeonJockey.getDiscordStatus()]);
      if (!active.current || current !== revision.current) return;
      if (config.ok && config.configuration) setConfiguration(config.configuration);
      if (status.ok && status.snapshot) setSnapshot(status.snapshot);
    } catch { if (active.current && current === revision.current) setFailure(true); }
  }
  useEffect(() => {
    active.current = true;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!working.current) await refresh();
      if (live) timer = setTimeout(poll, 1000);
    };
    void poll();
    return () => { live = false; active.current = false; revision.current++; clearTimeout(timer); };
  }, []);

  async function run(command: () => Promise<DiscordResult>) {
    if (working.current) return;
    working.current = true; revision.current++;
    const current = revision.current;
    setBusy(true); setFailure(false);
    try {
      const result = await command();
      if (active.current && current === revision.current) setFailure(!result.ok);
    } catch { if (active.current && current === revision.current) setFailure(true); }
    finally {
      working.current = false;
      if (active.current && current === revision.current) { setSecret(""); setBusy(false); await refresh(); }
    }
  }
  const connected = snapshot?.state === "ready" || snapshot?.state === "connecting";
  return <Stack spacing={1}>
    <TextField autoFocus margin="dense" size="small" id="token" label="Token" type="password" fullWidth
      variant="standard" autoComplete="off" InputLabelProps={{ shrink: true }} value={secret}
      onChange={(event) => setSecret(event.target.value)} disabled={busy}
      helperText="Enter your bot's token. Stored tokens cannot be revealed." />
    <Typography variant="caption" role="status">
      {configuration ? `${configuration.state === "configured" ? "Configured" : configuration.state === "missing" ? "Missing" : "Unavailable"} — ${configuration.persistence === "remembered" ? "remembered on this computer" : configuration.persistence === "session-only" ? "this session only; re-enter after restart" : "protected storage unsupported"}` : "Checking Discord configuration…"}
    </Typography>
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" size="small" disabled={busy || !secret || !configuration}
        onClick={() => void run(() => window.dungeonJockey.configureDiscord(secret))}>
        {configuration?.state === "missing" ? "Save" : "Replace"}
      </Button>
      <Button variant="outlined" size="small" disabled={busy || !configuration}
        onClick={() => void run(() => window.dungeonJockey.forgetDiscord())}>Forget</Button>
    </Stack>
    <Button fullWidth variant="outlined" size="small" disabled={busy || (!connected && configuration?.state !== "configured")}
      onClick={() => void run(() => connected ? window.dungeonJockey.disconnectDiscord() : window.dungeonJockey.connectDiscord())}>
      {connected ? "Disconnect" : "Connect"}
    </Button>
    <Typography variant="caption">{busy ? "Working…" : snapshot?.state === "connecting" ? "Connecting…" : connected ? "Connected" : "Disconnected"}</Typography>
    {(failure || (snapshot && snapshot.failure !== "none")) && <Typography role="alert" color="error" variant="caption">Discord operation failed. Check configuration and try again.</Typography>}
    <Typography variant="caption" textAlign="center" py={2}>Use a Discord bot token created and controlled by you.</Typography>
  </Stack>;
}
