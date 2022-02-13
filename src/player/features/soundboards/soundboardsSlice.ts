import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Sound {
  id: string;
  url: string;
  title: string;
  repeat: boolean;
  volume: number;
}

export interface Soundboard {
  sounds: string[];
  background: string;
  title: string;
  id: string;
}

export interface SoundboardsState {
  soundboards: {
    byId: Record<string, Soundboard>;
    allIds: string[];
  };
  sounds: Record<string, Sound>;
}

const initialState: SoundboardsState = {
  soundboards: {
    byId: {},
    allIds: [],
  },
  sounds: {},
};

export const soundboardsSlice = createSlice({
  name: "soundboards",
  initialState,
  reducers: {
    addSoundboard: (state, action: PayloadAction<Soundboard>) => {
      state.soundboards.byId[action.payload.id] = action.payload;
      state.soundboards.allIds.push(action.payload.id);
    },
    removeSoundboard: (state, action: PayloadAction<string>) => {
      for (let sound of state.soundboards.byId[action.payload].sounds) {
        delete state.sounds[sound];
      }
      delete state.soundboards.byId[action.payload];
      state.soundboards.allIds = state.soundboards.allIds.filter(
        (id) => id !== action.payload
      );
    },
    editSoundboard: (state, action: PayloadAction<Partial<Soundboard>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editSoundboard payload");
      }
      state.soundboards.byId[action.payload.id] = {
        ...state.soundboards.byId[action.payload.id],
        ...action.payload,
      };
    },
    addSound: (
      state,
      action: PayloadAction<{ sound: Sound; soundboardId: string }>
    ) => {
      const { sound, soundboardId } = action.payload;
      state.soundboards.byId[soundboardId].sounds.unshift(sound.id);
      state.sounds[sound.id] = sound;
    },
    addSounds: (
      state,
      action: PayloadAction<{ sounds: Sound[]; soundboardId: string }>
    ) => {
      const { sounds, soundboardId } = action.payload;
      state.soundboards.byId[soundboardId].sounds.unshift(
        ...sounds.map((sound) => sound.id)
      );
      for (let sound of sounds) {
        state.sounds[sound.id] = sound;
      }
    },
    removeSound: (
      state,
      action: PayloadAction<{ soundId: string; soundboardId: string }>
    ) => {
      const { soundId, soundboardId } = action.payload;
      state.soundboards.byId[soundboardId].sounds = state.soundboards.byId[
        soundboardId
      ].sounds.filter((id) => id !== soundId);
      delete state.sounds[soundId];
    },
    editSound: (state, action: PayloadAction<Partial<Sound>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editSound payload");
      }
      state.sounds[action.payload.id] = {
        ...state.sounds[action.payload.id],
        ...action.payload,
      };
    },
    moveSoundboard: (
      state,
      action: PayloadAction<{ active: string; over: string }>
    ) => {
      const oldIndex = state.soundboards.allIds.indexOf(action.payload.active);
      const newIndex = state.soundboards.allIds.indexOf(action.payload.over);
      state.soundboards.allIds.splice(oldIndex, 1);
      state.soundboards.allIds.splice(newIndex, 0, action.payload.active);
    },
    moveSound: (
      state,
      action: PayloadAction<{
        soundboardId: string;
        active: string;
        over: string;
      }>
    ) => {
      const soundboard = state.soundboards.byId[action.payload.soundboardId];
      const oldIndex = soundboard.sounds.indexOf(action.payload.active);
      const newIndex = soundboard.sounds.indexOf(action.payload.over);
      soundboard.sounds.splice(oldIndex, 1);
      soundboard.sounds.splice(newIndex, 0, action.payload.active);
    },
  },
});

export const {
  addSoundboard,
  removeSoundboard,
  editSoundboard,
  moveSoundboard,
  addSound,
  addSounds,
  removeSound,
  editSound,
  moveSound,
} = soundboardsSlice.actions;

export default soundboardsSlice.reducer;
