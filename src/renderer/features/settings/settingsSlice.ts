import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ConnectionStatus = "disconnected" | "connecting" | "ready";

export interface SettingsState {
  discordToken: string;
  urlBarEnabled: boolean;
  remoteEnabled: boolean;
  remoteHost: string;
  remotePort: number;
  externalInputsEnabled: boolean;
  multipleInputsEnabled: boolean;
  multipleOutputsEnabled: boolean;
}

const initialState: SettingsState = {
  discordToken: "",
  urlBarEnabled: true,
  remoteEnabled: false,
  remoteHost: "127.0.0.1",
  remotePort: 3333,
  externalInputsEnabled: false,
  multipleInputsEnabled: false,
  multipleOutputsEnabled: false,
};

export const connectionSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setDiscordToken: (state, action: PayloadAction<string>) => {
      state.discordToken = action.payload;
    },
    setURLBarEnabled: (state, action: PayloadAction<boolean>) => {
      state.urlBarEnabled = action.payload;
    },
    setRemoteEnabled: (state, action: PayloadAction<boolean>) => {
      state.remoteEnabled = action.payload;
    },
    setRemoteHost: (state, action: PayloadAction<string>) => {
      state.remoteHost = action.payload;
    },
    setRemotePort: (state, action: PayloadAction<number>) => {
      state.remotePort = action.payload;
    },
    setExternalInputsEnabled: (state, action: PayloadAction<boolean>) => {
      state.externalInputsEnabled = action.payload;
    },
    setMultipleInputsEnabled: (state, action: PayloadAction<boolean>) => {
      state.multipleInputsEnabled = action.payload;
    },
    setMultipleOutputsEnabled: (state, action: PayloadAction<boolean>) => {
      state.multipleOutputsEnabled = action.payload;
    },
  },
});

export const {
  setDiscordToken,
  setURLBarEnabled,
  setRemoteEnabled,
  setRemoteHost,
  setRemotePort,
  setExternalInputsEnabled,
  setMultipleInputsEnabled,
  setMultipleOutputsEnabled,
} = connectionSlice.actions;

export default connectionSlice.reducer;
