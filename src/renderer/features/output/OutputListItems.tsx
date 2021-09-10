import {
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@material-ui/core";
import ExpandLess from "@material-ui/icons/ExpandLessRounded";
import ExpandMore from "@material-ui/icons/ExpandMoreRounded";
import VolumeIcon from "@material-ui/icons/VolumeUpRounded";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { setVoiceChannels, setCurrentChannel } from "./outputSlice";

import React, { useState, useEffect } from "react";

export function OutputListItems() {
  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen(!open);
  }

  const output = useSelector((state: RootState) => state.output);
  const dispatch = useDispatch();

  useEffect(() => {
    window.kenku.on("voiceChannels", (args) => {
      const voiceChannels = args[0];
      dispatch(setVoiceChannels(voiceChannels));
    });

    window.kenku.on("channelLeft", () => {
      dispatch(setCurrentChannel("local"));
    });

    return () => {
      window.kenku.removeAllListeners("voiceChannels");
      window.kenku.removeAllListeners("channelLeft");
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
          {output.voiceChannels.map((channel) => (
            <React.Fragment key={channel.id}>
              <ListItemButton
                selected={output.currentChannel === channel.id}
                dense
                sx={{ px: 2 }}
                onClick={() => handleChannelChange(channel.id)}
              >
                <ListItemIcon
                  sx={{
                    minWidth: "36px",
                    color:
                      output.currentChannel === channel.id
                        ? "primary.main"
                        : undefined,
                  }}
                >
                  <VolumeIcon />
                </ListItemIcon>
                <ListItemText primary={channel.name} />
              </ListItemButton>
              {channel.id === "local" && output.voiceChannels.length > 1 && (
                <Divider variant="middle" />
              )}
            </React.Fragment>
          ))}
        </List>
      </Collapse>
    </>
  );
}
