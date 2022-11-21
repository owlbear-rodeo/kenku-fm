import React from "react";

import MinimizeIcon from "@mui/icons-material/HorizontalRuleRounded";
import MaximizeIcon from "@mui/icons-material/CropSquareRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";

import IconButton from "@mui/material/IconButton";

/** Controls for the main app window */
export function WindowControls() {
  return (
    <>
      <IconButton
        size="small"
        sx={{ WebkitAppRegion: "no-drag" }}
        onClick={() => window.kenku.minimize()}
        aria-label="minimize"
      >
        <MinimizeIcon />
      </IconButton>
      <IconButton
        size="small"
        sx={{ WebkitAppRegion: "no-drag" }}
        onClick={() => window.kenku.toggleMaximize()}
        aria-label="maximize"
      >
        <MaximizeIcon />
      </IconButton>
      <IconButton
        size="small"
        sx={{ WebkitAppRegion: "no-drag" }}
        onClick={() => window.kenku.close()}
        aria-label="close"
      >
        <CloseIcon />
      </IconButton>
    </>
  );
}
