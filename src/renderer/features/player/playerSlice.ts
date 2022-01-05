import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { Bookmark } from "../bookmarks/bookmarksSlice";

import icon from "../../../assets/player-icon.png";

export interface PlayerState {
  app: Bookmark & { preload: string };
  remoteEnabled: boolean;
}

const initialState: PlayerState = {
  app: {
    id: "__player__",
    icon: icon,
    url: window.kenku.playerGetURL(),
    preload: window.kenku.playerGetPreloadURL(),
    title: "Kenku Player",
  },
  remoteEnabled: false,
};

export const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    enableRemote: (state, action: PayloadAction<boolean>) => {
      state.remoteEnabled = action.payload;
    },
  },
});

export const { enableRemote } = playerSlice.actions;

export default playerSlice.reducer;
