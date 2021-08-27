import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuid } from "uuid";

export type PlaylistItemState =
  | "unknown"
  | "valid"
  | "invalid"
  | "loading"
  | "playing";

export interface PlaylistItem {
  url: string;
  state: PlaylistItemState;
  title: string;
  id: string;
}

export interface PlaylistState {
  items: Record<string, PlaylistItem>;
  order: string[];
}

const initialState: PlaylistState = {
  items: {
    initial: { id: "initial", url: "", state: "unknown", title: "" },
  },
  order: ["initial"],
};

export const playlistSlice = createSlice({
  name: "playlist",
  initialState,
  reducers: {
    addItem: (state) => {
      const id = uuid();
      state.items[id] = {
        id,
        url: "",
        state: "unknown",
        title: "",
      };
      state.order.push(id);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      if (state.items[action.payload]) {
        delete state.items[action.payload];
        state.order = state.order.filter((id) => id !== action.payload);
      }
    },
    editItem: (state, action: PayloadAction<Partial<PlaylistItem>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editItem payload");
      }
      state.items[action.payload.id] = {
        ...state.items[action.payload.id],
        ...action.payload,
      };
    },
  },
});

export const { addItem, removeItem, editItem } = playlistSlice.actions;

export default playlistSlice.reducer;
