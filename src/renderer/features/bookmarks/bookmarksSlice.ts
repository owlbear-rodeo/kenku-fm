import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Bookmark {
  url: string;
  icon: string;
  title: string;
  id: string;
}

export interface BookmarksState {
  bookmarks: {
    byId: Record<string, Bookmark>;
    allIds: string[];
  };
}

const initialState: BookmarksState = {
  bookmarks: {
    byId: {},
    allIds: [],
  },
};

export const bookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    addBookmark: (state, action: PayloadAction<Bookmark>) => {
      state.bookmarks.byId[action.payload.id] = action.payload;
      state.bookmarks.allIds.push(action.payload.id);
    },
    removeBookmark: (state, action: PayloadAction<string>) => {
      delete state.bookmarks.byId[action.payload];
      state.bookmarks.allIds = state.bookmarks.allIds.filter(
        (id) => id !== action.payload
      );
    },
    editBookmark: (state, action: PayloadAction<Partial<Bookmark>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editBookmark payload");
      }
      state.bookmarks.byId[action.payload.id] = {
        ...state.bookmarks.byId[action.payload.id],
        ...action.payload,
      };
    },
    moveBookmark: (
      state,
      action: PayloadAction<{ active: string; over: string }>
    ) => {
      const oldIndex = state.bookmarks.allIds.indexOf(action.payload.active);
      const newIndex = state.bookmarks.allIds.indexOf(action.payload.over);
      state.bookmarks.allIds.splice(oldIndex, 1);
      state.bookmarks.allIds.splice(newIndex, 0, action.payload.active);
    },
  },
});

export const { addBookmark, removeBookmark, editBookmark, moveBookmark } =
  bookmarksSlice.actions;

export default bookmarksSlice.reducer;
