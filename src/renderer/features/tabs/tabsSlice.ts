import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Tab {
  id: number;
  url: string;
  title: string;
  icon: string;
  /** The number of media tracks playing on this tab */
  playingMedia: number;
  muted: boolean;
}

export interface TabsState {
  tabs: {
    byId: Record<number, Tab>;
    allIds: number[];
  };
  selectedTab?: number;
}

const initialState: TabsState = {
  tabs: {
    byId: {},
    allIds: [],
  },
};

export const tabsSlice = createSlice({
  name: "tabs",
  initialState,
  reducers: {
    addTab: (state, action: PayloadAction<Tab>) => {
      state.tabs.byId[action.payload.id] = action.payload;
      state.tabs.allIds.push(action.payload.id);
    },
    removeTab: (state, action: PayloadAction<number>) => {
      delete state.tabs.byId[action.payload];
      state.tabs.allIds = state.tabs.allIds.filter(
        (id) => id !== action.payload
      );
      if (action.payload === state.selectedTab) {
        state.selectedTab = undefined;
      }
    },
    selectTab: (state, action: PayloadAction<number>) => {
      if (state.selectedTab) {
        window.kenku.hideBrowserView(state.selectedTab);
      }
      state.selectedTab = action.payload;
      window.kenku.showBrowserView(action.payload);
    },
    editTab: (state, action: PayloadAction<Partial<Tab>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editBrowserView payload");
      }
      if (action.payload.id in state.tabs.byId) {
        state.tabs.byId[action.payload.id] = {
          ...state.tabs.byId[action.payload.id],
          ...action.payload,
        };
      }
    },
    moveTab: (
      state,
      action: PayloadAction<{ active: number; over: number }>
    ) => {
      const oldIndex = state.tabs.allIds.indexOf(action.payload.active);
      const newIndex = state.tabs.allIds.indexOf(action.payload.over);
      state.tabs.allIds.splice(oldIndex, 1);
      state.tabs.allIds.splice(newIndex, 0, action.payload.active);
    },
    increaseTabPlayingMedia: (state, action: PayloadAction<number>) => {
      if (action.payload in state.tabs.byId) {
        state.tabs.byId[action.payload].playingMedia += 1;
      }
    },
    decreaseTabPlayingMedia: (state, action: PayloadAction<number>) => {
      if (action.payload in state.tabs.byId) {
        state.tabs.byId[action.payload].playingMedia = Math.max(
          state.tabs.byId[action.payload].playingMedia - 1,
          0
        );
      }
    },
  },
});

export const {
  addTab,
  removeTab,
  selectTab,
  editTab,
  moveTab,
  increaseTabPlayingMedia,
  decreaseTabPlayingMedia,
} = tabsSlice.actions;

export default tabsSlice.reducer;
