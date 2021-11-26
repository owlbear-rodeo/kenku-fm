import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { App } from "../apps/appsSlice";

import icon from "../../../assets/remote-icon.png";

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

export const remoteSlice = createSlice({
  name: "remote",
  initialState,
  reducers: {
    enableRemote: (state, action: PayloadAction<boolean>) => {
      state.remoteEnabled = action.payload;
    },
  },
});

export const { enableRemote } = remoteSlice.actions;

export default remoteSlice.reducer;
