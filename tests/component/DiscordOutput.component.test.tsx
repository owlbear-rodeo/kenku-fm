import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OutputListItems } from "../../src/renderer/features/output/OutputListItems";
import outputReducer from "../../src/renderer/features/output/outputSlice";
import connectionReducer from "../../src/renderer/features/connection/connectionSlice";
import settingsReducer, { setMultipleOutputsEnabled } from "../../src/renderer/features/settings/settingsSlice";
import { fakeDiscord, FAKE_DISCORD_SECRET } from "../fixtures/discord";

afterEach(cleanup);
describe("Discord output projection and independent Local Output", () => {
  it("rehydrates actual destinations, permits multi-guild/local concurrency, and switches only one guild", async () => {
    const { output } = fakeDiscord();
    await output.connect(FAKE_DISCORD_SECRET); await output.join("1", "11");
    const loopback = vi.fn();
    Object.defineProperty(window, "kenku", { configurable: true, value: { setLoopback: loopback } });
    const joined = vi.fn(async (guild: string, channel: string) => ({ ok: await output.join(guild, channel) }));
    const left = vi.fn(async (guild: string, channel: string) => { output.leave(guild, channel); return { ok: true }; });
    Object.defineProperty(window, "dungeonJockey", { configurable: true, value: {
      getDiscordStatus: async () => ({ ok: true, snapshot: output.snapshot() }), joinDiscordChannel: joined, leaveDiscordChannel: left,
    } });
    const store = configureStore({ reducer: { output: outputReducer, settings: settingsReducer, connection: connectionReducer } });
    store.dispatch(setMultipleOutputsEnabled(true));
    const view = render(<Provider store={store}><OutputListItems /></Provider>);
    await screen.findByText("One");
    expect(store.getState().output.outputs).toEqual(["local", "11"]);
    fireEvent.click(screen.getByText("Three"));
    await waitFor(() => expect(store.getState().output.outputs).toEqual(["local", "11", "21"]));
    fireEvent.click(screen.getByText("Two"));
    await waitFor(() => expect(store.getState().output.outputs).toEqual(["local", "21", "12"]));
    expect(left).not.toHaveBeenCalled(); expect(loopback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("This Computer"));
    await waitFor(() => expect(loopback).toHaveBeenCalledWith(false));
    expect(output.snapshot().destinations).toHaveLength(2);
    view.unmount(); render(<Provider store={store}><OutputListItems /></Provider>);
    await screen.findByText("Two"); expect(joined).toHaveBeenCalledTimes(2);
    output.dispose();
  });
});
