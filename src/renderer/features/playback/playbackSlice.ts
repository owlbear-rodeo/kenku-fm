import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PlaybackStateType = 'unknown' | 'paused' | 'loading' | 'playing';

export interface PlaybackState {
  item?: string;
  state: PlaybackStateType;
}

const initialState: PlaybackState = {
  state: 'unknown',
};

export const playbackSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    load: (state, action: PayloadAction<string>) => {
      state.item = action.payload;
      state.state = 'loading';
    },
    play: (state) => {
      state.state = 'playing';
    },
    pause: (state) => {
      state.state = 'paused';
    },
    stop: (state) => {
      state.item = undefined;
      state.state = 'unknown';
    },
  },
});

export const { load, play, pause, stop } = playbackSlice.actions;

export default playbackSlice.reducer;
