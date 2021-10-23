import React from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";

import { useDispatch } from "react-redux";
import { App, selectApp } from "../apps/appsSlice";

type RemoteListItemProps = {
  app: App;
  selected: boolean;
};

export function RemoteListItem({ app, selected }: RemoteListItemProps) {
  const dispatch = useDispatch();

  function select() {
    !selected && dispatch(selectApp(app.id));
  }

  return (
    <>
      <ListItemButton dense selected={selected} sx={{ px: 2 }} onClick={select}>
        {app.icon && (
          <Box
            sx={{
              width: "24px",
              height: "24px",
              objectFit: "cover",
              marginRight: 1,
            }}
          >
            <img src={app.icon} />
          </Box>
        )}
        <ListItemText primary={app.title} />
      </ListItemButton>
    </>
  );
}
