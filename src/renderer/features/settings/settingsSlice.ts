import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'ready';

export interface SettingsState {
  discordToken: string;
}

const initialState: SettingsState = {
  discordToken: '',
};

export const connectionSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setDiscordToken: (state, action: PayloadAction<string>) => {
      state.discordToken = action.payload;
    },
  },
});

export const { setDiscordToken } = connectionSlice.actions;

export default connectionSlice.reducer;
