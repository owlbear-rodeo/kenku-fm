import React from "react";

import MinimizeIcon from "@mui/icons-material/HorizontalRuleRounded";
import MaximizeIcon from "@mui/icons-material/CropSquareRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";

import IconButton from "@mui/material/IconButton";

/** Controls for the main app window */
export function WindowControls() {
  return (
    <>
      <IconButton size="small" onClick={() => window.kenku.minimize()}>
        <MinimizeIcon />
      </IconButton>
      <IconButton size="small" onClick={() => window.kenku.toggleMaximize()}>
        <MaximizeIcon />
      </IconButton>
      <IconButton size="small" onClick={() => window.kenku.close()}>
        <CloseIcon />
      </IconButton>
    </>
  );
}
