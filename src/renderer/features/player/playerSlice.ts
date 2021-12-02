import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { App } from "../apps/appsSlice";

import icon from "../../../assets/player-icon.png";

export interface PlayerState {
  app: App & { preload: string };
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
