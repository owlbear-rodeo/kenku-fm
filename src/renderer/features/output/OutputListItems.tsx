import React, { useState, useEffect, useRef } from "react";

import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";

import ExpandLess from "@mui/icons-material/ExpandLessRounded";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { addOutput, removeOutput, receiveDiscordSnapshot } from "./outputSlice";

import { setStatus } from "../connection/connectionSlice";
import type { DiscordResult } from "../../../dungeonJockey/contracts/discord";
import { OutputListItem } from "./OutputListItem";

export function OutputListItems() {
  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen(!open);
  }

  const output = useSelector((state: RootState) => state.output);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();

  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);
  const active = useRef(false);
  const working = useRef(false);
  const revision = useRef(0);
  async function refresh() {
    const current = revision.current;
    try {
      const result = await window.dungeonJockey.getDiscordStatus();
      if (active.current && current === revision.current && result.ok && result.snapshot) {
        dispatch(receiveDiscordSnapshot(result.snapshot));
        dispatch(setStatus(result.snapshot.state));
        if (result.snapshot.failure !== "none") setFailure(true);
      }
    } catch { if (active.current) setFailure(true); }
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
  }, [dispatch]);

  async function handleChannelChange(channelId: string) {
    if (working.current) return;
    working.current = true; revision.current++;
    setBusy(true); setFailure(false);
    const guildFor = (id: string) => output.guilds.find((g) => g.voiceChannels.some((c) => c.id === id))?.id;
    const requireSuccess = async (command: Promise<DiscordResult>) => { if (!(await command).ok) throw new Error("Discord operation failed"); };
    const local = (enabled: boolean) => {
      window.kenku.setLoopback(enabled);
      dispatch(enabled ? addOutput("local") : removeOutput("local"));
    };
    try {
      if (settings.multipleOutputsEnabled) {
        if (channelId === "local") local(!output.outputs.includes("local"));
        else if (output.outputs.includes(channelId)) await requireSuccess(window.dungeonJockey.leaveDiscordChannel(guildFor(channelId), channelId));
        else await requireSuccess(window.dungeonJockey.joinDiscordChannel(guildFor(channelId), channelId));
      } else {
        // Join first: a failed new destination leaves existing audio intact.
        if (channelId !== "local") await requireSuccess(window.dungeonJockey.joinDiscordChannel(guildFor(channelId), channelId));
        for (const previous of output.outputs) {
          if (previous !== "local" && previous !== channelId && guildFor(previous) !== guildFor(channelId)) {
            await requireSuccess(window.dungeonJockey.leaveDiscordChannel(guildFor(previous), previous));
          }
        }
        local(channelId === "local");
      }
    } catch { if (active.current) setFailure(true); }
    finally {
      working.current = false;
      if (active.current) { setBusy(false); await refresh(); }
    }
  }

  return (
    <>
      <ListItemButton onClick={toggleOpen}>
        <ListItemText
          primary={settings.multipleOutputsEnabled ? "Outputs" : "Output"}
        />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      {failure && <ListItemText role="alert" primary="Discord output unavailable. Try again." />}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <OutputListItem
            voiceChannel={{ id: "local", name: "This Computer" }}
            selected={output.outputs.includes("local")}
            tick={
              settings.multipleOutputsEnabled &&
              output.outputs.includes("local")
            }
            onClick={handleChannelChange}
            disabled={busy}
          />
          <Divider variant="middle" />
          {output.guilds.map((guild) => (
            <List key={guild.id} sx={{ py: 0 }}>
              {output.guilds.length > 0 && (
                <ListItem alignItems="center">
                  <ListItemAvatar
                    sx={{ minWidth: "36px", marginTop: 0, marginLeft: "8px" }}
                  >
                    <Avatar
                      sx={{ width: "24px", height: "24px" }}
                      alt={guild.name}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    sx={{
                      backgroundColor: "inherit",
                      color: "rgba(255, 255, 255, 0.7)",
                      padding: 0,
                    }}
                    primaryTypographyProps={{
                      sx: {
                        fontSize: "0.875rem",
                      },
                    }}
                  >
                    {guild.name}
                  </ListItemText>
                </ListItem>
              )}
              {guild.voiceChannels.map((channel) => (
                <OutputListItem
                  voiceChannel={channel}
                  selected={output.outputs.includes(channel.id)}
                  tick={
                    settings.multipleOutputsEnabled &&
                    output.outputs.includes(channel.id)
                  }
                  onClick={handleChannelChange}
                  disabled={busy}
                  key={channel.id}
                />
              ))}
            </List>
          ))}
        </List>
      </Collapse>
    </>
  );
}
