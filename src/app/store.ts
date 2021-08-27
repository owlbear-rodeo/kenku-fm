import { configureStore } from "@reduxjs/toolkit";
import playlistReducer from "../features/playlist/playlistSlice";
import connectionReducer from "../features/connection/connectionSlice";

export const store = configureStore({
  reducer: {
    playlist: playlistReducer,
    connection: connectionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
