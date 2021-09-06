import React, { useEffect, useRef, useState } from 'react';
import { Divider, IconButton, Stack, TextField } from '@material-ui/core';
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  RefreshRounded,
} from '@material-ui/icons';

import { drawerWidth } from '../../common/ActionDrawer';

export function View({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [showControls] = useState(false);
  const [viewId, setViewId] = useState<number>(-1);

  const urlRef = useRef(initialUrl);
  useEffect(() => {
    urlRef.current = url;
  });

  useEffect(() => {
    const id = window.kenku.createBrowserView(
      urlRef.current,
      drawerWidth,
      showControls ? 73 : 0,
      window.innerWidth - drawerWidth,
      window.innerHeight
    );
    setViewId(id);
    return () => {
      window.kenku.removeBrowserView(id);
    };
  }, [showControls]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.kenku.loadURL(viewId, url);
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrl(e.target.value);
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

View.defaultProps = {
  initialUrl: 'https://tabletopaudio.com',
};
