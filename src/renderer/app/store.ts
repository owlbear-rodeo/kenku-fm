import { configureStore } from '@reduxjs/toolkit';
import playlistReducer from '../features/playlist/playlistSlice';
import connectionReducer from '../features/connection/connectionSlice';
import outputReducer from '../features/output/outputSlice';

export const store = configureStore({
  reducer: {
    playlist: playlistReducer,
    connection: connectionReducer,
    output: outputReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
