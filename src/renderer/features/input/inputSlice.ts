import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Device = {
  id: string;
  label: string;
};

export interface OutputState {
  devices: Device[];
  inputs: string[];
}

const initialState: OutputState = {
  devices: [],
  inputs: [],
};

export const inputSlice = createSlice({
  name: "input",
  initialState,
  reducers: {
    setDevices: (state, action: PayloadAction<Device[]>) => {
      state.devices = action.payload;
    },
    setInput: (state, action: PayloadAction<string>) => {
      state.inputs = [action.payload];
    },
    addInput: (state, action: PayloadAction<string>) => {
      if (state.inputs.includes(action.payload)) {
        return;
      }
      state.inputs.push(action.payload);
    },
    removeInput: (state, action: PayloadAction<string>) => {
      state.inputs = state.inputs.filter((id) => id !== action.payload);
    },
  },
});

export const { setDevices, setInput, addInput, removeInput } =
  inputSlice.actions;

export default inputSlice.reducer;
