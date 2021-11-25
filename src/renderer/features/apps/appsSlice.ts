import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface App {
  url: string;
  icon: string;
  title: string;
  id: string;
}

export interface AppsState {
  apps: {
    byId: Record<string, App>;
    allIds: string[];
  };
  selectedApp?: string;
}

const initialState: AppsState = {
  apps: {
    byId: {},
    allIds: [],
  },
};

export const appsSlice = createSlice({
  name: "apps",
  initialState,
  reducers: {
    addApp: (state, action: PayloadAction<App>) => {
      state.apps.byId[action.payload.id] = action.payload;
      state.apps.allIds.push(action.payload.id);
    },
    removeApp: (state, action: PayloadAction<string>) => {
      delete state.apps.byId[action.payload];
      state.apps.allIds = state.apps.allIds.filter(
        (id) => id !== action.payload
      );
      if (action.payload === state.selectedApp) {
        state.selectedApp = undefined;
      }
    },
    selectApp: (state, action: PayloadAction<string>) => {
      state.selectedApp = action.payload;
    },
    editApp: (state, action: PayloadAction<Partial<App>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editApp payload");
      }
      state.apps.byId[action.payload.id] = {
        ...state.apps.byId[action.payload.id],
        ...action.payload,
      };
    },
    moveApp: (
      state,
      action: PayloadAction<{ active: string; over: string }>
    ) => {
      const oldIndex = state.apps.allIds.indexOf(action.payload.active);
      const newIndex = state.apps.allIds.indexOf(action.payload.over);
      state.apps.allIds.splice(oldIndex, 1);
      state.apps.allIds.splice(newIndex, 0, action.payload.active);
    },
  },
});

export const { addApp, removeApp, selectApp, editApp, moveApp } =
  appsSlice.actions;

export default appsSlice.reducer;
