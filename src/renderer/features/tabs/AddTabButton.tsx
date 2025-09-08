import React from "react";

import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/AddRounded";

import { useDispatch } from "react-redux";
import { addTab, selectTab } from "../tabs/tabsSlice";
import { getBounds } from "../tabs/getBounds";

export function AddTabButton() {
  const dispatch = useDispatch();

  async function handleAddClick() {
    const bounds = getBounds();
    const id = await window.kenku.createBrowserView(
      "",
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    );
    dispatch(
      addTab({
        id,
        url: "",
        title: "New Tab",
        icon: "",
        playingMedia: 0,
        muted: false,
      }),
    );
    dispatch(selectTab(id));
  }

  return (
    <IconButton
      sx={{ mx: 1, WebkitAppRegion: "no-drag" }}
      size="small"
      onClick={handleAddClick}
      aria-label="add tab"
    >
      <AddIcon />
    </IconButton>
  );
}
