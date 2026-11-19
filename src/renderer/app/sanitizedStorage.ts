type PersistenceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};

/** Sanitize the active-origin root before redux-persist can dispatch REHYDRATE.
 * Run on every read, including already-current versions. Never copy a legacy root
 * to backup/logs, or read another application's origin/profile.
 */
export function sanitizedStorage(storage: PersistenceStorage): PersistenceStorage {
  return {
    ...storage,
    async getItem(key) {
      const raw = await storage.getItem(key);
      if (key !== "persist:root" || !raw) return raw;
      try {
        const root = JSON.parse(raw);
        if (typeof root.settings !== "string") return raw;
        const settings = JSON.parse(root.settings);
        if (!settings || typeof settings !== "object" || !("discordToken" in settings)) return raw;
        delete settings.discordToken;
        root.settings = JSON.stringify(settings);
        const cleaned = JSON.stringify(root);
        await storage.setItem(key, cleaned);
        return cleaned;
      } catch {
        // Fail closed: no unsanitized root reaches a Redux action on parse/write
        // failure. Do not log an exception that may include serialized secrets.
        throw new Error("Saved preferences are unavailable");
      }
    },
  };
}
