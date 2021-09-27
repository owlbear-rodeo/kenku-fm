import React, { useState, useEffect } from "react";

import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";

import ExpandLess from "@mui/icons-material/ExpandLessRounded";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setGuilds, setCurrentChannel } from "./outputSlice";

import { OutputListItem } from "./OutputListItem";

export function OutputListItems() {
  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen(!open);
  }

  const output = useSelector((state: RootState) => state.output);
  const dispatch = useDispatch();

  useEffect(() => {
    window.kenku.on("DISCORD_GUILDS", (args) => {
      const guilds = args[0];
      dispatch(setGuilds(guilds));
    });

    window.kenku.on("DISCORD_CHANNEL_LEFT", () => {
      dispatch(setCurrentChannel("local"));
    });

    return () => {
      window.kenku.removeAllListeners("DISCORD_GUILDS");
      window.kenku.removeAllListeners("DISCORD_CHANNEL_LEFT");
    };
  }, [dispatch]);

  function handleChannelChange(channelId: string) {
    if (channelId !== output.currentChannel) {
      dispatch(setCurrentChannel(channelId));
      window.kenku.joinChannel(channelId);
    }
  }

  return (
    <>
      <ListItemButton onClick={toggleOpen}>
        <ListItemText primary="Output" />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <OutputListItem
            voiceChannel={{ id: "local", name: "This Computer" }}
            selected={output.currentChannel === "local"}
            onClick={handleChannelChange}
          />
          <Divider variant="middle" />
          {output.guilds.map((guild) => (
            <React.Fragment key={guild.id}>
              {output.guilds.length > 1 && (
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
                  <ListSubheader
                    sx={{
                      backgroundColor: "inherit",
                      lineHeight: "36px",
                      padding: 0,
                    }}
                  >
                    {guild.name}
                  </ListSubheader>
                </ListItem>
              )}
              {guild.voiceChannels.map((channel) => (
                <OutputListItem
                  voiceChannel={channel}
                  selected={output.currentChannel === channel.id}
                  onClick={handleChannelChange}
                  key={channel.id}
                />
              ))}
            </React.Fragment>
          ))}
        </List>
      </Collapse>
    </>
  );
}
