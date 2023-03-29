import React, { useState, useEffect } from "react";

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
import { addOutput, removeOutput, setGuilds, setOutput } from "./outputSlice";

import { OutputListItem } from "./OutputListItem";

export function OutputListItems() {
  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen(!open);
  }

  const output = useSelector((state: RootState) => state.output);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();

  useEffect(() => {
    window.kenku.on("DISCORD_GUILDS", (args) => {
      const guilds = args[0];
      dispatch(setGuilds(guilds));
    });

    window.kenku.on("DISCORD_CHANNEL_LEFT", (args) => {
      const id = args[0];
      dispatch(removeOutput(id));
    });

    window.kenku.on("DISCORD_CHANNEL_JOINED", (args) => {
      dispatch(addOutput(args[0]));
    });

    return () => {
      window.kenku.removeAllListeners("DISCORD_GUILDS");
      window.kenku.removeAllListeners("DISCORD_CHANNEL_LEFT");
      window.kenku.removeAllListeners("DISCORD_CHANNEL_JOINED");
    };
  }, [dispatch]);

  function handleChannelChange(channelId: string) {
    if (settings.multipleOutputsEnabled) {
      // Already selected
      if (output.outputs.includes(channelId)) {
        dispatch(removeOutput(channelId));
        if (channelId === "local") {
          window.kenku.setLoopback(false);
        } else {
          window.kenku.leaveChannel(channelId);
        }
      } else {
        // Not selected
        dispatch(addOutput(channelId));
        if (channelId === "local") {
          window.kenku.setLoopback(true);
        } else {
          // Check if the channel is in the same guild as one already selected
          const channelsToGuild: Record<string, string> = {};
          for (const guild of output.guilds) {
            for (const channel of guild.voiceChannels) {
              channelsToGuild[channel.id] = guild.id;
            }
          }
          const currentGuild = channelsToGuild[channelId];
          let guildChannel: string;
          for (const id of output.outputs) {
            const guild = channelsToGuild[id];
            if (guild === currentGuild) {
              guildChannel = id;
            }
          }
          // Discord only allows for one channel to be joined per guild so we need to leave
          // a channel if it's in the same guild as the one we're about to join
          if (guildChannel) {
            dispatch(removeOutput(guildChannel));
            window.kenku.leaveChannel(guildChannel);
          }

          window.kenku.joinChannel(channelId);
        }
      }
    } else {
      const prev = output.outputs[0];

      // Already selected so return early
      if (prev === channelId) {
        return;
      }

      if (prev) {
        if (prev === "local") {
          window.kenku.setLoopback(false);
        } else {
          // Only leave channel if selecting a different guild
          window.kenku.leaveChannel(prev);
        }
      }
      dispatch(setOutput(channelId));
      if (channelId === "local") {
        window.kenku.setLoopback(true);
      } else {
        window.kenku.joinChannel(channelId);
      }
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
                      src={guild.icon}
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
