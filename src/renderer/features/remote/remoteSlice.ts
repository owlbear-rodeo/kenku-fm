import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { App } from "../apps/appsSlice";

import icon from "../../../assets/remote-icon.png";

export interface RemoteState {
  app: App;
  enabled: boolean;
}

const initialState: RemoteState = {
  app: {
    id: "__remote__",
    icon: icon,
    url: "",
    title: "Kenku Remote",
  },
  enabled: false,
};

export const remoteSlice = createSlice({
  name: "remote",
  initialState,
  reducers: {
    setRemoteEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
    setRemoteURL: (state, action: PayloadAction<string>) => {
      state.app.url = action.payload;
    },
  },
});

export const { setRemoteEnabled, setRemoteURL } = remoteSlice.actions;

export default remoteSlice.reducer;
