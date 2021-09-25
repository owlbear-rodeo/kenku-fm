import React, { useEffect, useRef, useState } from "react";
import { Divider, IconButton, Stack, TextField } from "@material-ui/core";
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  RefreshRounded,
} from "@material-ui/icons";

import { drawerWidth } from "../../common/ActionDrawer";

type ViewProps = {
  url: string;
  setURL?: (url: string) => void;
};

export function View({ url, setURL }: ViewProps) {
  const [showControls] = useState(false);
  const [viewId, setViewId] = useState<number>(-1);

  const urlRef = useRef(url);
  useEffect(() => {
    urlRef.current = url;
  });

  useEffect(() => {
    let id: number | undefined = undefined;
    window.kenku
      .createBrowserView(
        urlRef.current,
        drawerWidth,
        showControls ? 73 : 0,
        window.innerWidth - drawerWidth,
        window.innerHeight
      )
      .then((_id) => {
        id = _id;
        setViewId(id);
      });

    return () => {
      id && window.kenku.removeBrowserView(id);
    };
  }, [showControls]);

  useEffect(() => {
    window.kenku.loadURL(viewId, url);
  }, [viewId, url]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.kenku.loadURL(viewId, url);
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setURL?.(e.target.value);
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

  if (!showControls) {
    return null;
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
            onChange={handleUrlChange}
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
