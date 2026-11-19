import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscordSettings } from "../../src/renderer/features/settings/DiscordSettings";
import type { DiscordResult } from "../../src/dungeonJockey/contracts/discord";
import { deferred, FAKE_DISCORD_SECRET } from "../fixtures/discord";

function setup(state = "missing", persistence = "remembered") {
  let configuration = { state, persistence };
  let connection = "disconnected";
  const ok = { ok: true, protocolVersion: 1 };
  const bridge = {
    getDiscordConfiguration: vi.fn(async () => ({ ...ok, configuration })),
    getDiscordStatus: vi.fn(async () => ({ ...ok, snapshot: { state: connection, failure: "none", sequence: 1, guilds: [], destinations: [] } })),
    configureDiscord: vi.fn(async () => { configuration = { ...configuration, state: "configured" }; return ok; }),
    forgetDiscord: vi.fn(async () => { configuration = { ...configuration, state: "missing" }; return ok; }),
    connectDiscord: vi.fn(async () => { connection = "ready"; return ok; }),
    disconnectDiscord: vi.fn(async () => { connection = "disconnected"; return ok; }),
  };
  Object.defineProperty(window, "dungeonJockey", { value: bridge, configurable: true });
  return bridge;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("transient Discord Settings", () => {
  it("saves once, clears input after settlement, replaces, connects and forgets", async () => {
    const bridge = setup(); render(<DiscordSettings />);
    await screen.findByText(/Missing — remembered/);
    const input = screen.getByLabelText("Token");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.change(input, { target: { value: FAKE_DISCORD_SECRET } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText(/Configured — remembered/);
    expect(input).toHaveValue(""); expect(bridge.configureDiscord).toHaveBeenCalledExactlyOnceWith(FAKE_DISCORD_SECRET);
    fireEvent.change(input, { target: { value: "fake-replacement" } });
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    await waitFor(() => expect(input).toHaveValue(""));
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await screen.findByRole("button", { name: "Disconnect" });
    fireEvent.click(screen.getByRole("button", { name: "Forget" }));
    await screen.findByText(/Missing — remembered/);
    expect(bridge.forgetDiscord).toHaveBeenCalledOnce();
    expect(JSON.stringify(localStorage)).not.toContain(FAKE_DISCORD_SECRET);
  });
  it.each(["unavailable", "configured"])("shows %s session-only state without filling a placeholder secret", async (state) => {
    setup(state, "session-only"); render(<DiscordSettings />);
    await screen.findByText(/this session only; re-enter after restart/);
    expect(screen.getByLabelText("Token")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Replace" })).toBeDisabled();
    if (state === "unavailable") expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Forget" })).not.toBeDisabled();
  });
  it("disables conflicting actions, sanitizes errors, and recovers", async () => {
    const bridge = setup(); render(<DiscordSettings />); await screen.findByText(/Missing/);
    const pending = deferred<DiscordResult>(); bridge.configureDiscord.mockReturnValueOnce(pending.promise as never);
    fireEvent.change(screen.getByLabelText("Token"), { target: { value: FAKE_DISCORD_SECRET } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Forget" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await act(async () => pending.reject(new Error(FAKE_DISCORD_SECRET)));
    expect(screen.getByRole("alert")).not.toHaveTextContent(FAKE_DISCORD_SECRET);
    expect(screen.getByLabelText("Token")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Token"), { target: { value: "fake-retry" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText(/Configured/);
  });
  it("clears on close/unmount, ignores stale completions and never reconnects on remount", async () => {
    const bridge = setup("configured"); const view = render(<DiscordSettings />); await screen.findByText(/Configured/);
    fireEvent.click(screen.getByRole("button", { name: "Connect" })); await screen.findByRole("button", { name: "Disconnect" });
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" })); await screen.findByRole("button", { name: "Connect" });
    fireEvent.change(screen.getByLabelText("Token"), { target: { value: FAKE_DISCORD_SECRET } });
    view.unmount(); render(<DiscordSettings />); await screen.findByText(/Configured/);
    expect(screen.getByLabelText("Token")).toHaveValue("");
    expect(bridge.connectDiscord).toHaveBeenCalledOnce(); expect(bridge.disconnectDiscord).toHaveBeenCalledOnce();
  });
});
