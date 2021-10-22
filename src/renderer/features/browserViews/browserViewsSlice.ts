import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface BrowserView {
  id: number;
  url: string;
  appId: string;
}

export interface BrowserViewsState {
  browserViews: {
    byId: Record<number, BrowserView>;
    allIds: number[];
  };
  selectedBrowserView?: number;
}

const initialState: BrowserViewsState = {
  browserViews: {
    byId: {},
    allIds: [],
  },
};

export const browserViewsSlice = createSlice({
  name: "browserViews",
  initialState,
  reducers: {
    addBrowserView: (state, action: PayloadAction<BrowserView>) => {
      state.browserViews.byId[action.payload.id] = action.payload;
      state.browserViews.allIds.push(action.payload.id);
    },
    removeBrowserView: (state, action: PayloadAction<number>) => {
      delete state.browserViews.byId[action.payload];
      state.browserViews.allIds = state.browserViews.allIds.filter(
        (id) => id !== action.payload
      );
      if (action.payload === state.selectedBrowserView) {
        state.selectedBrowserView = undefined;
      }
    },
    selectBrowserView: (state, action: PayloadAction<number>) => {
      state.selectedBrowserView = action.payload;
    },
    editBrowserView: (state, action: PayloadAction<Partial<BrowserView>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editBrowserView payload");
      }
      state.browserViews.byId[action.payload.id] = {
        ...state.browserViews.byId[action.payload.id],
        ...action.payload,
      };
    },
  },
});

export const {
  addBrowserView,
  removeBrowserView,
  selectBrowserView,
  editBrowserView,
} = browserViewsSlice.actions;

export default browserViewsSlice.reducer;
