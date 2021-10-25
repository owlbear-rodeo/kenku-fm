import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { App } from "../apps/appsSlice";

import icon from "../../../assets/remote-icon.png";

export interface RemoteState {
  app: App & { preload: string };
  enabled: boolean;
}

const initialState: RemoteState = {
  app: {
    id: "__remote__",
    icon: icon,
    url: window.kenku.remoteGetURL(),
    preload: window.kenku.remoteGetPreloadURL(),
    title: "Kenku Remote",
  },
  enabled: false,
};

export const remoteSlice = createSlice({
  name: "remote",
  initialState,
  reducers: {
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
  },
});

export const { setEnabled } = remoteSlice.actions;

export default remoteSlice.reducer;
