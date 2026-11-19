import { combineReducers, configureStore, Middleware } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import { describe, expect, it, vi } from "vitest";
import { sanitizedStorage } from "../../src/renderer/app/sanitizedStorage";
import settingsReducer from "../../src/renderer/features/settings/settingsSlice";
import bookmarksReducer from "../../src/renderer/features/bookmarks/bookmarksSlice";
import { FAKE_DISCORD_SECRET } from "../fixtures/discord";

describe("active-origin legacy credential removal", () => {
  it.each([4, 5])("strips version %s before REHYDRATE and preserves settings/bookmarks durably", async (version) => {
    const settings = { ...settingsReducer(undefined, { type: "init" }), multipleOutputsEnabled: true, discordToken: FAKE_DISCORD_SECRET };
    const bookmarks = { bookmarks: { byId: { fixture: { id: "fixture", title: "Saved", url: "https://example.com", icon: "" } }, allIds: ["fixture"] } };
    let bytes = JSON.stringify({ settings: JSON.stringify(settings), bookmarks: JSON.stringify(bookmarks), _persist: JSON.stringify({ version, rehydrated: true }) });
    const storage = {
      getItem: vi.fn(async () => bytes), setItem: vi.fn(async (_key: string, value: string) => { bytes = value; }), removeItem: vi.fn(async () => {}),
    };
    const actions: unknown[] = [];
    const record: Middleware = () => (next) => (action) => { actions.push(action); return next(action); };
    const reducer = persistReducer({ key: "root", version: 5, storage: sanitizedStorage(storage) },
      combineReducers({ settings: settingsReducer, bookmarks: bookmarksReducer }));
    const store = configureStore({ reducer, middleware: (defaults) => defaults({ serializableCheck: false }).concat(record) });
    let persistor: ReturnType<typeof persistStore>;
    await new Promise<void>((resolve) => { persistor = persistStore(store, undefined, resolve); });
    expect(store.getState().settings).not.toHaveProperty("discordToken");
    expect(store.getState().settings.multipleOutputsEnabled).toBe(true);
    expect(store.getState().bookmarks).toEqual(bookmarks);
    expect(JSON.stringify(actions)).not.toContain(FAKE_DISCORD_SECRET);
    expect(bytes).not.toContain(FAKE_DISCORD_SECRET);
    await persistor.flush(); persistor.pause();
    expect(JSON.parse(JSON.parse(bytes).settings)).not.toHaveProperty("discordToken");
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith("persist:root");
  });
  it("fails closed on a clean-state write failure without forwarding serialized data", async () => {
    const raw = JSON.stringify({ settings: JSON.stringify({ discordToken: FAKE_DISCORD_SECRET }) });
    const storage = sanitizedStorage({ getItem: async () => raw,
      setItem: async () => { throw new Error(FAKE_DISCORD_SECRET); }, removeItem: async () => {} });
    await expect(storage.getItem("persist:root")).rejects.toThrow("Saved preferences are unavailable");
  });
});
