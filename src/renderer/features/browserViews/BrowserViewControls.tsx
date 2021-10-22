import React, { useEffect, useRef, useState } from "react";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";

type BrowserViewControlsProps = {
  viewId: number;
  url: string;
  onURLChange: (url: string) => void;
};

export function BrowserViewControls({
  viewId,
  url,
  onURLChange,
}: BrowserViewControlsProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.kenku.loadURL(viewId, url);
  }

  function handleURLChange(e: React.ChangeEvent<HTMLInputElement>) {
    onURLChange(e.target.value);
  }

  function handleBack() {
    window.kenku.goBack(viewId);
  }

  function handleForward() {
    window.kenku.goForward(viewId);
  }

  function handleReload() {
    window.kenku.reload(viewId);
  }

  return (
    <Stack
      direction="column"
      sx={{
        flexGrow: 1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ p: 2 }}>
        <IconButton onClick={handleBack}>
          <ArrowBackRounded />
        </IconButton>
        <IconButton onClick={handleForward}>
          <ArrowForwardRounded />
        </IconButton>
        <form onSubmit={handleSubmit} style={{ flexGrow: 1 }}>
          <TextField
            variant="outlined"
            label="url"
            value={url}
            InputLabelProps={{
              shrink: true,
            }}
            size="small"
            fullWidth
            onChange={handleURLChange}
          />
        </form>
        <IconButton onClick={handleReload}>
          <RefreshRounded />
        </IconButton>
      </Stack>
      <Divider />
    </Stack>
  );
}
