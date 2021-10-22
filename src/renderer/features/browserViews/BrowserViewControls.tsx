import React from "react";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import InputBase from "@mui/material/InputBase";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";

type BrowserViewControlsProps = {
  viewId: number;
  url: string;
  onURLChange: (url: string) => void;
  disabled?: boolean;
};

export const BrowserViewControls = React.forwardRef(
  ({ viewId, url, onURLChange, disabled }: BrowserViewControlsProps, ref) => {
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
        ref={ref}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ py: 1, px: 2, alignItems: "center" }}
        >
          <IconButton onClick={handleBack} disabled={disabled} size="small">
            <ArrowBackRounded />
          </IconButton>
          <IconButton onClick={handleForward} disabled={disabled} size="small">
            <ArrowForwardRounded />
          </IconButton>
          <form onSubmit={handleSubmit} style={{ flexGrow: 1 }}>
            <InputBase
              sx={{
                bgcolor: "rgba(0, 0, 0, 0.15)",
                px: 2,
                borderRadius: "16px",
              }}
              placeholder={disabled ? "" : "Enter a URL"}
              inputProps={{ "aria-label": "enter a URL" }}
              value={url}
              fullWidth
              onChange={handleURLChange}
              disabled={disabled}
            />
          </form>
          <IconButton onClick={handleReload} disabled={disabled} size="small">
            <RefreshRounded />
          </IconButton>
        </Stack>
        <Divider />
      </Stack>
    );
  }
);
