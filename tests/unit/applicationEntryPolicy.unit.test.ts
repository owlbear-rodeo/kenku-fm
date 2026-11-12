import { describe, expect, it } from "vitest";
import {
  createApplicationEntryPolicy,
  isExternalApplicationLink,
} from "../../src/dungeonJockey/main/applicationEntryPolicy";

describe("application entry policy", () => {
  const entry = "file:///C:/Dungeon%20Jockey/renderer/main_window/index.html";
  const policy = createApplicationEntryPolicy(entry, true);

  it("compares canonical parsed file identity and permits document fragments", () => {
    expect(policy.allows(entry)).toBe(true);
    expect(policy.allows(`${entry}#settings`)).toBe(true);
    expect(
      policy.allows(
        "file:///C:/Dungeon%20Jockey/renderer/main_window/./index.html",
      ),
    ).toBe(true);
  });

  it.each([
    `${entry}.evil`,
    `${entry}/child`,
    `${entry}?other`,
    "file:///C:/Dungeon%20Jockey/renderer/player_window/index.html",
    "file:///C:/elsewhere/index.html",
    "file://server/C:/Dungeon%20Jockey/renderer/main_window/index.html",
    "https://example.com/index.html",
    "data:text/html,hello",
    "about:blank",
    "not a URL",
  ])("rejects other local documents and misleading URLs: %s", (url) => {
    expect(policy.allows(url)).toBe(false);
  });

  it("pins development origin, port, scheme, path and query independently", () => {
    const development = createApplicationEntryPolicy(
      "http://localhost:3000/main_window",
      false,
    );
    expect(
      development.allows("http://localhost:3000/main_window#settings"),
    ).toBe(true);
    for (const url of [
      "http://localhost:3001/main_window",
      "https://localhost:3000/main_window",
      "http://127.0.0.1:3000/main_window",
      "http://localhost:3000/player_window",
      "http://localhost:3000/main_window/",
      "http://localhost:3000/main_window?x",
      "http://localhost:3000@evil.test/main_window",
      "http://user@localhost:3000/main_window",
    ])
      expect(development.allows(url)).toBe(false);
  });

  it("fails closed on mismatched environment or invalid main-selected entries", () => {
    expect(() =>
      createApplicationEntryPolicy("https://localhost/app", true),
    ).toThrow();
    expect(() => createApplicationEntryPolicy(entry, false)).toThrow();
    expect(() =>
      createApplicationEntryPolicy("http://user@localhost/app", false),
    ).toThrow();
    expect(() => createApplicationEntryPolicy("invalid", false)).toThrow();
  });

  it("permits ordinary external links without opening local or executable schemes", () => {
    for (const url of [
      "https://example.com",
      "http://example.com",
      "mailto:test@example.com",
    ]) {
      expect(isExternalApplicationLink(url)).toBe(true);
    }
    for (const url of [
      entry,
      "javascript:alert(1)",
      "data:text/html,x",
      "custom:run",
      "invalid",
    ]) {
      expect(isExternalApplicationLink(url)).toBe(false);
    }
  });
});
