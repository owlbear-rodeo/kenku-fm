import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { DiscordSnapshot } from "../../../dungeonJockey/contracts/discord";

export type VoiceChannel = {
  id: string;
  name: string;
};

export type Guild = {
  id: string;
  name: string;
  voiceChannels: VoiceChannel[];
};

export interface OutputState {
  guilds: Guild[];
  outputs: string[];
  sequence: number;
}

const initialState: OutputState = {
  guilds: [],
  outputs: ["local"],
  sequence: -1,
};

export const outputSlice = createSlice({
  name: "output",
  initialState,
  reducers: {
    receiveDiscordSnapshot: (state, action: PayloadAction<DiscordSnapshot>) => {
      if (action.payload.sequence < state.sequence) return;
      state.sequence = action.payload.sequence;
      state.guilds = action.payload.guilds;
      state.outputs = [...state.outputs.filter((id) => id === "local"),
        ...action.payload.destinations.filter((d) => d.state === "ready").map((d) => d.channelId)];
    },
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

export const { receiveDiscordSnapshot, setGuilds, setOutput, addOutput, removeOutput } =
  outputSlice.actions;

export default outputSlice.reducer;
