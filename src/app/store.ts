import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "../features/counter/counterSlice";
import playlistReducer from "../features/playlist/playlistSlice";

export const store = configureStore({
  reducer: {
    playlist: playlistReducer,
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
