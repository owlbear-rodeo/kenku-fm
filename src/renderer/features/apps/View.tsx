import React, { useEffect, useRef, useState } from "react";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";

import { drawerWidth } from "../../common/ActionDrawer";

type ViewProps = {
  url: string;
};

export function View({ url }: ViewProps) {
  const [showControls, setShowControls] = useState(false);
  const [viewId, setViewId] = useState<number>(-1);
  const [customURL, setCustomURL] = useState(url);

  const urlRef = useRef(url);
  useEffect(() => {
    urlRef.current = url;
  });

  useEffect(() => {
    window.kenku.on("SHOW_CONTROLS", (args) => {
      const show = args[0];
      setShowControls(show);
    });
    window.kenku.on("BROWSER_VIEW_DID_NAVIGATE", (args) => {
      setCustomURL(args[1]);
    });

    return () => {
      window.kenku.removeAllListeners("SHOW_CONTROLS");
      window.kenku.removeAllListeners("BROWSER_VIEW_DID_NAVIGATE");
    };
  }, []);

  useEffect(() => {
    window.kenku.on("REMOTE_OPEN_URL", (args) => {
      const url = args[0];
      setCustomURL(args[0]);
      window.kenku.loadURL(viewId, url);
    });

    return () => {
      window.kenku.removeAllListeners("REMOTE_OPEN_URL");
    };
  }, [viewId]);

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
    window.kenku.loadURL(viewId, customURL);
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCustomURL(e.target.value);
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
            value={customURL}
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
