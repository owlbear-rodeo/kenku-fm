import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { shuffleArray } from "../../common/shuffle";

export interface Queue {
  current: number;
  tracks: string[];
  /** Shuffled indices into the tracks array */
  shuffled: number[];
  playlistId: string;
}

export interface Playback {
  current: number;
  duration: number;
}

export interface Track {
  url: string;
  title: string;
}

export type Repeat = "off" | "track" | "playlist";

export interface PlaybackState {
  queue?: Queue;
  playing: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  track?: Track;
  playback?: Playback;
}

const initialState: PlaybackState = {
  playing: false,
  volume: 1,
  muted: false,
  shuffle: false,
  repeat: "playlist",
};

export const playbackSlice = createSlice({
  name: "playback",
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
    shuffleQueue: (state) => {
      if (state.queue) {
        // Find and remove the current track, shuffle the rest and insert it back at the start
        const trackIndex = state.queue.current;
        const shuffledIndex = state.queue.shuffled.indexOf(trackIndex);
        state.queue.shuffled.splice(shuffledIndex, 1);
        shuffleArray(state.queue.shuffled);
        state.queue.shuffled.unshift(trackIndex);
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
      state.playback = { current: 0, duration: action.payload.duration };
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
        state.playback.current = action.payload;
      }
    },
    adjustVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    decreaseVolume: (state) => {
      state.volume = Math.min(state.volume + -0.05, 1);
    },
    increaseVolume: (state) => {
      state.volume = Math.min(state.volume + 0.05, 1);
    },
    toggleMute: (state) => {
      state.muted = !state.muted;
    },
    mute: (state, action: PayloadAction<boolean>) => {
      state.muted = action.payload;
    },
    shuffle: (state, action: PayloadAction<boolean>) => {
      state.shuffle = action.payload;
    },
    toggleRepeat: (state) => {
      switch (state.repeat) {
        case "off":
          state.repeat = "playlist";
          break;
        case "playlist":
          state.repeat = "track";
          break;
        case "track":
          state.repeat = "off";
          break;
      }
    },
    repeat: (state, action: PayloadAction<Repeat>) => {
      state.repeat = action.payload;
    },
  },
});

export const {
  startQueue,
  updateQueue,
  shuffleQueue,
  moveQueueIfNeeded,
  addTrackToQueueIfNeeded,
  playTrack,
  stopTrack,
  playPause,
  updatePlayback,
  adjustVolume,
  decreaseVolume,
  increaseVolume,
  toggleMute,
  mute,
  shuffle,
  toggleRepeat,
  repeat,
} = playbackSlice.actions;

export default playbackSlice.reducer;
