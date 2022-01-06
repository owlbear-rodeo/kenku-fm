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
    setMediaPlaying: (state, action: PayloadAction<boolean>) => {
      state.tab.playingMedia = action.payload;
    },
  },
});

export const { enableRemote, setPlayerId, setMediaPlaying } =
  playerSlice.actions;

export default playerSlice.reducer;
