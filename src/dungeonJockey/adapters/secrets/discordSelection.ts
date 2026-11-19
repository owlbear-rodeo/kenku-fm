import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { CredentialId, parseCredentialId } from "../../domain/ids/CredentialId";

export interface DiscordSelection {
  read(): Promise<CredentialId | null>;
  write(id: CredentialId | null): Promise<void>;
}

/** Fixed main-selected profile file, never a renderer-supplied locator. */
export function createDiscordSelection(profileRoot: string, platform: string): DiscordSelection {
  if (platform === "linux") {
    let selected: CredentialId | null = null;
    return { read: async () => selected, write: async (id) => { selected = id; } };
  }
  const filename = path.join(profileRoot, "discord-configuration.json");
  return {
    async read() {
      try {
        const entry = await fs.lstat(filename);
        if (!entry.isFile() || entry.size > 256) throw new Error();
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
        throw new Error("Discord configuration unavailable");
      }
      try {
        const record = JSON.parse(await fs.readFile(filename, "utf8"));
        if (!record || record.version !== 1 || Object.keys(record).length !== 2) throw new Error();
        return record.credentialId === null ? null : parseCredentialId(record.credentialId);
      } catch { throw new Error("Discord configuration unavailable"); }
    },
    async write(id) {
      const temporary = path.join(profileRoot, `discord-configuration-${randomUUID()}.tmp`);
      let created = false;
      try {
        await fs.mkdir(profileRoot, { recursive: true });
        const handle = await fs.open(temporary, "wx", 0o600);
        created = true;
        try { await handle.writeFile(JSON.stringify({ version: 1, credentialId: id }), "utf8"); await handle.sync(); }
        finally { await handle.close(); }
        await fs.rename(temporary, filename);
        created = false;
      } catch { throw new Error("Discord configuration unavailable"); }
      finally { if (created) await fs.unlink(temporary).catch(() => {}); }
    },
  };
}
