import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ConnectionStatus = "disconnected" | "connecting" | "ready";

export interface ConnectionState {
  status: ConnectionStatus;
}

const initialState: ConnectionState = {
  status: "disconnected",
};

export const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.status = action.payload;
    },
  },
});

export const { setStatus } = connectionSlice.actions;

export default connectionSlice.reducer;
