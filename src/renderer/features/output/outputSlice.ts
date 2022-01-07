import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type VoiceChannel = {
  id: string;
  name: string;
};

export type Guild = {
  id: string;
  name: string;
  icon: string;
  voiceChannels: VoiceChannel[];
};

export interface OutputState {
  guilds: Guild[];
  outputs: string[];
}

const initialState: OutputState = {
  guilds: [],
  outputs: ["local"],
};

export const outputSlice = createSlice({
  name: "output",
  initialState,
  reducers: {
    setGuilds: (state, action: PayloadAction<Guild[]>) => {
      state.guilds = action.payload;
    },
    setOutput: (state, action: PayloadAction<string>) => {
      state.outputs = [action.payload];
    },
    addOutput: (state, action: PayloadAction<string>) => {
      if (state.outputs.includes(action.payload)) {
        return;
      }
      state.outputs.push(action.payload);
    },
    removeOutput: (state, action: PayloadAction<string>) => {
      state.outputs = state.outputs.filter(
        (channel) => channel !== action.payload
      );
    },
  },
});

export const { setGuilds, setOutput, addOutput, removeOutput } =
  outputSlice.actions;

export default outputSlice.reducer;
