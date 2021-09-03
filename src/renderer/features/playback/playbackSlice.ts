import { createSlice, Dispatch, PayloadAction } from '@reduxjs/toolkit';
import { shuffle } from '../../common/shuffle';
import { Playlist, PlaylistItem } from '../playlist/playlistSlice';

export type PlaybackStateType = 'unknown' | 'paused' | 'loading' | 'playing';

export interface PlaybackState {
  queue: string[];
  shuffledQueue: string[];
  shuffle: boolean;
  loop: boolean;
  current: number;
  state: PlaybackStateType;
}

const initialState: PlaybackState = {
  queue: [],
  shuffledQueue: [],
  shuffle: false,
  loop: true,
  current: -1,
  state: 'unknown',
};

export const playbackSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    queue: (state, action: PayloadAction<string[]>) => {
      state.queue = action.payload;
      if (state.shuffle) {
        state.shuffledQueue = [...action.payload];
        shuffle(state.shuffledQueue);
      }
    },
    load: (state, action: PayloadAction<string>) => {
      if (state.shuffle) {
        state.current = state.shuffledQueue.indexOf(action.payload);
      } else {
        state.current = state.queue.indexOf(action.payload);
      }
      if (state.current >= 0) {
        state.state = 'loading';
      }
    },
    play: (state) => {
      state.state = 'playing';
    },
    pause: (state) => {
      state.state = 'paused';
    },
    stop: (state) => {
      state.current = -1;
      state.state = 'unknown';
    },
  },
});

export const { queue, load, play, pause, stop } = playbackSlice.actions;

export function getCurrentItem(state: PlaybackState): string | undefined {
  const items = state.shuffle ? state.shuffledQueue : state.queue;
  return items[state.current];
}

export function getNextItem(state: PlaybackState): string | undefined {
  const items = state.shuffle ? state.shuffledQueue : state.queue;
  const next = state.current + 1;
  if (state.loop) {
    return items[next % items.length];
  } else if (next < items.length) {
    return items[next];
  }
  return undefined;
}

export function togglePlay(
  item: PlaylistItem,
  state: PlaybackState,
  dispatch: Dispatch
): boolean {
  const id = getCurrentItem(state);
  if (id) {
    if (item.id === id) {
      if (state.state === 'playing') {
        dispatch(pause());
        window.discord.pause(id);
        return true;
      } else if (state.state === 'paused') {
        dispatch(play());
        window.discord.play(item.url, item.id);
        return true;
      }
    }
  }
  return false;
}

export default playbackSlice.reducer;
