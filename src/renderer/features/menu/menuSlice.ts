import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MenuState {
  menuOpen: boolean;
}

const initialState: MenuState = {
  menuOpen: true,
};

export const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    setMenuState: (state, action: PayloadAction<"open" | "closed">) => {
      state.menuOpen = action.payload === "open";
    },
  },
});

export const { setMenuState } = menuSlice.actions;

export default menuSlice.reducer;
