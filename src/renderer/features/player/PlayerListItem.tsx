import React, { useEffect } from "react";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { enableRemote } from "./playerSlice";
import { selectBookmark } from "../bookmarks/bookmarksSlice";

export function PlayerListItem() {
  const dispatch = useDispatch();

  const bookmarks = useSelector((state: RootState) => state.bookmarks);
  const player = useSelector((state: RootState) => state.player);

  useEffect(() => {
    window.kenku.on("PLAYER_REMOTE_ENABLED", (args) => {
      const enabled = args[0];
      dispatch(enableRemote(enabled));
    });

    return () => {
      window.kenku.removeAllListeners("PLAYER_REMOTE_ENABLED");
    };
  }, [player.app]);

  const selected = bookmarks.selectedBookmark === player.app.id;

  function select() {
    !selected && dispatch(selectBookmark(player.app.id));
  }

  return (
    <ListItemButton dense selected={selected} sx={{ px: 2 }} onClick={select}>
      <Box
        sx={{
          width: "24px",
          height: "24px",
          objectFit: "cover",
          marginRight: 1,
        }}
      >
        <img src={player.app.icon} />
      </Box>
      <ListItemText primary={player.app.title} />
    </ListItemButton>
  );
}
