import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type VoiceChannel = {
  id: string;
  name: string;
};

export interface OutputState {
  voiceChannels: VoiceChannel[];
  currentChannel: string;
}

const initialState: OutputState = {
  voiceChannels: [{ id: 'local', name: 'This Computer' }],
  currentChannel: 'local',
};

export const outputSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setVoiceChannels: (state, action: PayloadAction<VoiceChannel[]>) => {
      state.voiceChannels = action.payload;
    },
    setCurrentChannel: (state, action: PayloadAction<string>) => {
      state.currentChannel = action.payload;
    },
  },
});

export const { setVoiceChannels, setCurrentChannel } = outputSlice.actions;

export default outputSlice.reducer;
