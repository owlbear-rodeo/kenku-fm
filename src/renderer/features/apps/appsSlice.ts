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
    byId: {
      tabletopaudio: {
        id: "tabletopaudio",
        url: "https://tabletopaudio.com/",
        title: "Tabletop Audio",
        icon: "https://images.tabletopaudio.com/touch-icons/icon-hd.png",
      },
      spotify: {
        id: "youtube",
        url: "https://www.youtube.com/",
        title: "YouTube",
        icon: "https://www.youtube.com/s/desktop/8a85ed3f/img/favicon_144x144.png",
      },
    },
    allIds: ["tabletopaudio", "youtube"],
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
  },
});

export const { addApp, removeApp, selectApp, editApp } = appsSlice.actions;

export default appsSlice.reducer;
