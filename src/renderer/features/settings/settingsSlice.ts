import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ConnectionStatus = "disconnected" | "connecting" | "ready";

export interface SettingsState {
  discordToken: string;
  showControls: boolean;
  remoteEnabled: boolean;
  remoteHost: string;
  remotePort: number;
  showInputs: boolean;
  allowMultiInputOutput: boolean;
}

const initialState: SettingsState = {
  discordToken: "",
  showControls: true,
  remoteEnabled: false,
  remoteHost: "127.0.0.1",
  remotePort: 3333,
  showInputs: false,
  allowMultiInputOutput: false,
};

export const connectionSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setDiscordToken: (state, action: PayloadAction<string>) => {
      state.discordToken = action.payload;
    },
    setShowControls: (state, action: PayloadAction<boolean>) => {
      state.showControls = action.payload;
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
  },
});

export const {
  setDiscordToken,
  setShowControls,
  setRemoteEnabled,
  setRemoteHost,
  setRemotePort,
} = connectionSlice.actions;

export default connectionSlice.reducer;
