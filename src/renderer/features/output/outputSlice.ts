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
  currentChannel: string;
}

const initialState: OutputState = {
  guilds: [],
  currentChannel: "local",
};

export const outputSlice = createSlice({
  name: "output",
  initialState,
  reducers: {
    setGuilds: (state, action: PayloadAction<Guild[]>) => {
      state.guilds = action.payload;
    },
    setCurrentChannel: (state, action: PayloadAction<string>) => {
      state.currentChannel = action.payload;
    },
  },
});

export const { setGuilds, setCurrentChannel } = outputSlice.actions;

export default outputSlice.reducer;
