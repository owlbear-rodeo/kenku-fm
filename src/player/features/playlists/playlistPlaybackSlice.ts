import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { shuffleArray } from "../../common/shuffle";
import { Track } from "./playlistsSlice";

export interface Queue {
  current: number;
  tracks: string[];
  /** Shuffled indices into the tracks array */
  shuffled: number[];
  playlistId: string;
}

export interface Playback {
  progress: number;
  duration: number;
}

export type Repeat = "off" | "track" | "playlist";

export interface PlaylistPlaybackState {
  queue?: Queue;
  playing: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  track?: Track;
  playback?: Playback;
}

const initialState: PlaylistPlaybackState = {
  playing: false,
  volume: 1,
  muted: false,
  shuffle: false,
  repeat: "playlist",
};

export const playlistPlaybackSlice = createSlice({
  name: "playlistPlayback",
  initialState,
  reducers: {
    startQueue: (
      state,
      action: PayloadAction<{
        tracks: string[];
        trackId: string;
        playlistId: string;
      }>
    ) => {
      const { tracks, trackId, playlistId } = action.payload;
      // Create array of all indices into the tracks array
      const shuffled = Array.from(Array(tracks.length).keys());
      // Remove track to play, shuffle the rest and insert it back at the start
      const trackIndex = tracks.indexOf(trackId);
      shuffled.splice(trackIndex, 1);
      shuffleArray(shuffled);
      shuffled.unshift(trackIndex);

      state.queue = {
        tracks,
        current: tracks.indexOf(trackId),
        playlistId,
        shuffled,
      };
    },
    updateQueue: (state, action: PayloadAction<number>) => {
      if (state.queue) {
        state.queue.current = action.payload;
      }
    },
    moveQueueIfNeeded: (
      state,
      action: PayloadAction<{
        playlistId: string;
        active: string;
        over: string;
      }>
    ) => {
      if (
        state.queue &&
        state.queue.playlistId === action.payload.playlistId &&
        !state.shuffle
      ) {
        const currentId = state.queue.tracks[state.queue.current];

        const oldIndex = state.queue.tracks.indexOf(action.payload.active);
        const newIndex = state.queue.tracks.indexOf(action.payload.over);
        state.queue.tracks.splice(oldIndex, 1);
        state.queue.tracks.splice(newIndex, 0, action.payload.active);

        // Update the current index
        state.queue.current = state.queue.tracks.indexOf(currentId);
      }
    },
    addTrackToQueueIfNeeded: (
      state,
      action: PayloadAction<{ playlistId: string; trackId: string }>
    ) => {
      if (state.queue && state.queue.playlistId === action.payload.playlistId) {
        state.queue.tracks.unshift(action.payload.trackId);
        // Increase all shuffled indices by one and add the new 0 index
        state.queue.shuffled = state.queue.shuffled.map(
          (index) => (index += 1)
        );
        state.queue.shuffled.unshift(0);
        // Bump current to make room
        state.queue.current += 1;
      }
    },
    playTrack: (
      state,
      action: PayloadAction<{ track: Track; duration: number }>
    ) => {
      state.track = action.payload.track;
      state.playing = true;
      state.playback = { progress: 0, duration: action.payload.duration };
    },
    stopTrack: (state) => {
      state.track = undefined;
      state.playing = false;
      state.playback = undefined;
    },
    playPause: (state, action: PayloadAction<boolean>) => {
      state.playing = action.payload;
    },
    updatePlayback: (state, action: PayloadAction<number>) => {
      if (state.playback) {
        state.playback.progress = action.payload;
      }
    },
    adjustVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    mute: (state, action: PayloadAction<boolean>) => {
      state.muted = action.payload;
    },
    shuffle: (state, action: PayloadAction<boolean>) => {
      const shuffle = action.payload;
      // Update the queue to reflect the new shuffle state
      if (state.queue) {
        const currentIndex = state.shuffle
          ? state.queue.shuffled[state.queue.current]
          : state.queue.current;
        if (shuffle) {
          // Find and remove the current track, shuffle the rest and insert it back at the start
          const shuffledIndex = state.queue.shuffled.indexOf(currentIndex);
          state.queue.shuffled.splice(shuffledIndex, 1);
          shuffleArray(state.queue.shuffled);
          state.queue.shuffled.unshift(currentIndex);
          state.queue.current = 0;
        } else {
          // Reset the queue index
          state.queue.current = currentIndex;
        }
      }
      state.shuffle = shuffle;
    },
    repeat: (state, action: PayloadAction<Repeat>) => {
      state.repeat = action.payload;
    },
  },
});

export const {
  startQueue,
  updateQueue,
  moveQueueIfNeeded,
  addTrackToQueueIfNeeded,
  playTrack,
  stopTrack,
  playPause,
  updatePlayback,
  adjustVolume,
  mute,
  shuffle,
  repeat,
} = playlistPlaybackSlice.actions;

export default playlistPlaybackSlice.reducer;
