import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';

export type PlaylistItemState =
  | 'unknown'
  | 'valid'
  | 'invalid'
  | 'loading'
  | 'playing';

export interface PlaylistItem {
  url: string;
  state: PlaylistItemState;
  title: string;
  id: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: string[];
}

export interface PlaylistState {
  playlists: {
    byId: Record<string, Playlist>;
    allIds: string[];
  };
  items: {
    byId: Record<string, PlaylistItem>;
    allIds: string[];
  };
  selectedPlaylist?: string;
}

const initialState: PlaylistState = {
  playlists: {
    byId: {},
    allIds: [],
  },
  items: {
    byId: {},
    allIds: [],
  },
};

export const playlistSlice = createSlice({
  name: 'playlist',
  initialState,
  reducers: {
    addPlaylist: (state) => {
      const id = uuid();
      state.playlists.byId[id] = {
        id,
        name: 'New Playlist',
        items: [],
      };
      state.playlists.allIds.push(id);
    },
    removePlaylist: (state, action: PayloadAction<string>) => {
      delete state.playlists.byId[action.payload];
      state.playlists.allIds = state.playlists.allIds.filter(
        (id) => id !== action.payload
      );
      if (action.payload === state.selectedPlaylist) {
        state.selectedPlaylist = undefined;
      }
    },
    selectPlaylist: (state, action: PayloadAction<string>) => {
      state.selectedPlaylist = action.payload;
    },
    editPlaylist: (state, action: PayloadAction<Partial<Playlist>>) => {
      if (!action.payload.id) {
        throw Error('Id needed in editPlaylist payload');
      }
      state.playlists.byId[action.payload.id] = {
        ...state.playlists.byId[action.payload.id],
        ...action.payload,
      };
    },
    addItem: (state, action: PayloadAction<{ playlistId: string }>) => {
      const id = uuid();
      state.items.byId[id] = {
        id,
        url: '',
        state: 'unknown',
        title: '',
      };
      state.items.allIds.push(id);
      state.playlists.byId[action.payload.playlistId].items.push(id);
    },
    removeItem: (
      state,
      action: PayloadAction<{ playlistId: string; itemId: string }>
    ) => {
      delete state.items.byId[action.payload.itemId];
      state.items.allIds = state.items.allIds.filter(
        (id) => id !== action.payload.itemId
      );
      let playlist = state.playlists.byId[action.payload.playlistId];
      playlist.items = playlist.items.filter(
        (id) => id !== action.payload.itemId
      );
    },
    editItem: (state, action: PayloadAction<Partial<PlaylistItem>>) => {
      if (!action.payload.id) {
        throw Error('Id needed in editItem payload');
      }
      state.items.byId[action.payload.id] = {
        ...state.items.byId[action.payload.id],
        ...action.payload,
      };
    },
    stopAll: (state) => {
      for (let id of state.items.allIds) {
        if (state.items.byId[id].state === 'playing') {
          state.items.byId[id].state = 'valid';
        }
      }
    },
  },
});

export const {
  addPlaylist,
  removePlaylist,
  selectPlaylist,
  editPlaylist,
  addItem,
  removeItem,
  editItem,
  stopAll,
} = playlistSlice.actions;

export default playlistSlice.reducer;
