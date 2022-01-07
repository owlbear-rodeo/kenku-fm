import React from "react";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItem from "@mui/material/ListItem";
import Box from "@mui/material/Box";

import VolumeIcon from "@mui/icons-material/VolumeUpRounded";
import TickIcon from "@mui/icons-material/CheckCircleRounded";

import { VoiceChannel } from "./outputSlice";

type OutputListItemProps = {
  voiceChannel: VoiceChannel;
  selected: boolean;
  tick?: boolean;
  onClick: (channelId: string) => void;
};

export function OutputListItem({
  voiceChannel,
  selected,
  tick,
  onClick,
}: OutputListItemProps) {
  return (
    <ListItem
      disablePadding
      secondaryAction={
        tick && (
          <Box sx={{ height: "1rem" }}>
            <TickIcon sx={{ fontSize: "1rem" }} />
          </Box>
        )
      }
    >
      <ListItemButton
        selected={selected}
        dense
        onClick={() => onClick(voiceChannel.id)}
      >
        <ListItemIcon
          sx={{
            minWidth: "36px",
            color: selected ? "primary.main" : undefined,
          }}
        >
          <VolumeIcon />
        </ListItemIcon>
        <ListItemText primary={voiceChannel.name} />
      </ListItemButton>
    </ListItem>
  );
}
