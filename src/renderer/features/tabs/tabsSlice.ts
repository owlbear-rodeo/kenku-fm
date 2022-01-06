import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Tab {
  id: number;
  url: string;
  title: string;
  icon: string;
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
  },
});

export const { addTab, removeTab, selectTab, editTab } = tabsSlice.actions;

export default tabsSlice.reducer;
