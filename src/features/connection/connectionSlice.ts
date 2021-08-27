import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ConnectionStatus = "disconnected" | "connecting" | "ready";

export interface ConnectionState {
  status: ConnectionStatus;
  token: string;
}

const initialState: ConnectionState = {
  status: "disconnected",
  token: localStorage.getItem("token") || "",
};

export const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.status = action.payload;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
    },
  },
});

export const { setStatus, setToken } = connectionSlice.actions;

export default connectionSlice.reducer;
