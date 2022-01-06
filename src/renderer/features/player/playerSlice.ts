import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { Tab } from "../tabs/tabsSlice";

import icon from "../../../assets/player-icon.png";

export interface PlayerState {
  tab: Tab & { preload: string };
  remoteEnabled: boolean;
}

const initialState: PlayerState = {
  tab: {
    id: -1,
    icon: icon,
    url: window.kenku.playerGetURL(),
    preload: window.kenku.playerGetPreloadURL(),
    title: "Kenku Player",
    playingMedia: 0,
    muted: false,
  },
  remoteEnabled: false,
};

export const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    enableRemote: (state, action: PayloadAction<boolean>) => {
      state.remoteEnabled = action.payload;
    },
    setPlayerId: (state, action: PayloadAction<number>) => {
      state.tab.id = action.payload;
    },
    increasePlayingMedia: (state) => {
      state.tab.playingMedia += 1;
    },
    decreasePlayingMedia: (state) => {
      state.tab.playingMedia = Math.max(state.tab.playingMedia - 1, 0);
    },
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.tab.muted = action.payload;
    },
  },
});

export const {
  enableRemote,
  setPlayerId,
  increasePlayingMedia,
  decreasePlayingMedia,
  setMuted,
} = playerSlice.actions;

export default playerSlice.reducer;
