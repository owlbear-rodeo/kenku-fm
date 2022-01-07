import React from "react";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItem from "@mui/material/ListItem";
import Box from "@mui/material/Box";

import MicIcon from "@mui/icons-material/MicExternalOnRounded";
import TickIcon from "@mui/icons-material/CheckCircleRounded";

import { Device } from "./inputSlice";

type InputListItemProps = {
  device: Device;
  selected: boolean;
  tick?: boolean;
  onClick: (channelId: string) => void;
};

export function InputListItem({
  device,
  selected,
  tick,
  onClick,
}: InputListItemProps) {
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
      sx={{
        "& .MuiListItemButton-root": {
          pr: tick ? "32px" : undefined,
        },
      }}
    >
      <ListItemButton
        selected={selected}
        dense
        onClick={() => onClick(device.id)}
      >
        <ListItemIcon
          sx={{
            minWidth: "36px",
            color: selected ? "primary.main" : undefined,
          }}
        >
          <MicIcon />
        </ListItemIcon>
        <ListItemText primary={device.label} />
      </ListItemButton>
    </ListItem>
  );
}
