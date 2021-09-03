import { combineReducers, configureStore } from '@reduxjs/toolkit';
import playlistReducer from '../features/playlist/playlistSlice';
import connectionReducer from '../features/connection/connectionSlice';
import outputReducer from '../features/output/outputSlice';
import playbackReducer from '../features/playback/playbackSlice';
import settingsReducer from '../features/settings/settingsSlice';

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
  playlist: playlistReducer,
  connection: connectionReducer,
  output: outputReducer,
  playback: playbackReducer,
  settings: settingsReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['playlist', 'settings'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
