import React from "react";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";

import VolumeIcon from "@mui/icons-material/VolumeUpRounded";

import { VoiceChannel } from "./outputSlice";

type OutputListItemProps = {
  voiceChannel: VoiceChannel;
  selected: boolean;
  onClick: (channelId: string) => void;
};

export function OutputListItem({
  voiceChannel,
  selected,
  onClick,
}: OutputListItemProps) {
  return (
    <ListItemButton
      selected={selected}
      dense
      sx={{ px: 2 }}
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
  );
}
