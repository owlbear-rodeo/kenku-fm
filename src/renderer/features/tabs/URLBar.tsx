import React, { useEffect, useRef } from "react";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import InputBase from "@mui/material/InputBase";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";

import { sanitizeUrl } from "@braintree/sanitize-url";

import { getDropURL } from "../../common/drop";

type URLBarProps = {
  viewId: number;
  url: string;
  onURLChange: (url: string) => void;
  disabled?: boolean;
};

export function URLBar({ viewId, url, onURLChange, disabled }: URLBarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sanitizedUrl = sanitizeUrl(prependHttp(url));
    window.kenku.loadURL(viewId, sanitizedUrl);
  }

  function handleURLChange(e: React.ChangeEvent<HTMLInputElement>) {
    onURLChange(e.target.value);
  }

  function handleURLDrop(event: React.DragEvent<HTMLInputElement>) {
    event.preventDefault();
    const url = getDropURL(event.dataTransfer);
    if (url) {
      onURLChange(url);
    }
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

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Focus URL bar when changing tabs to an empty URL
    if (url === "") {
      inputRef.current?.focus();
    }
  }, [viewId, url]);

  return (
    <Stack
      direction="column"
      sx={{
        flexGrow: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ py: 0.5, pb: 1, px: 2, alignItems: "center" }}
      >
        <IconButton onClick={handleBack} disabled={disabled} size="small">
          <ArrowBackRounded />
        </IconButton>
        <IconButton onClick={handleForward} disabled={disabled} size="small">
          <ArrowForwardRounded />
        </IconButton>
        <form onSubmit={handleSubmit} style={{ flexGrow: 1 }}>
          <InputBase
            inputRef={inputRef}
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
            onDrop={handleURLDrop}
          />
        </form>
        <IconButton onClick={handleReload} disabled={disabled} size="small">
          <RefreshRounded />
        </IconButton>
      </Stack>
    </Stack>
  );
}

function prependHttp(url: string, { https = true } = {}) {
  url = url.trim();

  if (/^\.*\/|^(?!localhost)\w+?:/.test(url)) {
    return url;
  }

  return url.replace(/^(?!(?:\w+?:)?\/\/)/, https ? "https://" : "http://");
}
