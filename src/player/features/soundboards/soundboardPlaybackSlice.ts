import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Sound } from "./soundboardsSlice";

export interface SoundPlayback extends Sound {
  current: number;
  duration: number;
}

export interface PlaylistPlaybackState {
  playback: Record<string, SoundPlayback>;
}

const initialState: PlaylistPlaybackState = {
  playback: {},
};

export const soundboardPlaybackSlice = createSlice({
  name: "soundboardPlayback",
  initialState,
  reducers: {
    playSound: (
      state,
      action: PayloadAction<{ sound: Sound; duration: number }>
    ) => {
      const { sound, duration } = action.payload;
      state.playback[sound.id] = { ...sound, current: 0, duration };
    },
    stopSound: (state, action: PayloadAction<string>) => {
      delete state.playback[action.payload];
    },
    updatePlayback: (
      state,
      action: PayloadAction<{ id: string; current: number }>
    ) => {
      const { id, current } = action.payload;
      if (id in state.playback) {
        state.playback[id].current = current;
      }
    },
  },
});

export const { playSound, stopSound, updatePlayback } =
  soundboardPlaybackSlice.actions;

export default soundboardPlaybackSlice.reducer;
