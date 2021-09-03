import { createSlice, Dispatch, PayloadAction } from '@reduxjs/toolkit';
import { shuffle } from '../../common/shuffle';
import { PlaylistItem } from '../playlist/playlistSlice';

export type PlaybackStateType = 'unknown' | 'paused' | 'loading' | 'playing';
export type LoopState = 'off' | 'on' | 'one';

export interface PlaybackState {
  queue: string[];
  shuffledQueue: string[];
  shuffle: boolean;
  loop: LoopState;
  current: number;
  state: PlaybackStateType;
}

const initialState: PlaybackState = {
  queue: [],
  shuffledQueue: [],
  shuffle: false,
  loop: 'on',
  current: -1,
  state: 'unknown',
};

export const playbackSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    queue: (state, action: PayloadAction<string[]>) => {
      state.queue = action.payload;
      state.shuffledQueue = [...action.payload];
      shuffle(state.shuffledQueue);
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
    toggleShuffle: (state) => {
      const currentId = state.shuffle
        ? state.shuffledQueue[state.current]
        : state.queue[state.current];
      state.shuffle = !state.shuffle;
      // Retain state.current after shuffle toggle
      if (currentId) {
        if (state.shuffle) {
          state.current = state.shuffledQueue.indexOf(currentId);
        } else {
          state.current = state.queue.indexOf(currentId);
        }
      }
    },
    toggleLoop: (state) => {
      switch (state.loop) {
        case 'off':
          state.loop = 'on';
          break;
        case 'on':
          state.loop = 'one';
          break;
        case 'one':
          state.loop = 'off';
          break;
      }
    },
  },
});

export const { queue, load, play, pause, stop, toggleShuffle, toggleLoop } =
  playbackSlice.actions;

export function getCurrentItem(state: PlaybackState): string | undefined {
  const items = state.shuffle ? state.shuffledQueue : state.queue;
  return items[state.current];
}

export function getNextItem(state: PlaybackState): string | undefined {
  const items = state.shuffle ? state.shuffledQueue : state.queue;
  const next = state.current + 1;
  if (state.loop === 'on') {
    return items[next % items.length];
  } else if (state.loop === 'one') {
    return items[state.current];
  } else if (next < items.length) {
    return items[next];
  }
  return undefined;
}

export function getPreviousItem(state: PlaybackState): string | undefined {
  const items = state.shuffle ? state.shuffledQueue : state.queue;
  console.log(items, state);
  const next = state.current - 1;
  if (state.loop === 'on') {
    return items[next < 0 ? items.length - 1 : next];
  } else if (state.loop === 'one') {
    return items[state.current];
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
        window.discord.resume(item.id);
        return true;
      }
    }
  }
  return false;
}

export default playbackSlice.reducer;
