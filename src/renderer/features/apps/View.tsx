import React, { useEffect, useState } from 'react';
import { Divider, IconButton, Stack, TextField } from '@material-ui/core';
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  RefreshRounded,
} from '@material-ui/icons';

export function View({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [viewId] = useState(window.kenku.createBrowserView(initialUrl, 240));

  useEffect(() => {
    return () => {
      window.kenku.removeBrowserView(viewId);
    };
  }, [viewId]);

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

  return (
    <Stack
      direction="column"
      sx={{
        width: '100%',
      }}
    >
      <Divider />
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
