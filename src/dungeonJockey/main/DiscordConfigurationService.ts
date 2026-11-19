import type { DiscordSelection } from "../adapters/secrets/discordSelection";
import type { DiscordConfiguration } from "../contracts/discord";
import type { DiscordOutputPort } from "../ports/DiscordOutputPort";
import type { SecretPersistence, SecretStorePort } from "../ports/SecretStorePort";

/** One selected record, owned by main. Mutations reject overlap instead of queuing secrets. */
export class DiscordConfigurationService {
  private busy = false;
  private epoch = 0;
  private started = false;
  private disposed = false;
  private connecting = false;
  private cancelConnect: (() => void) | undefined;
  constructor(private readonly selection: DiscordSelection, private readonly getStore: () => SecretStorePort,
    private readonly output: DiscordOutputPort, private readonly persistence: SecretPersistence) {}

  async status(): Promise<DiscordConfiguration> {
    try {
      const id = await this.selection.read();
      if (!id) return { state: "missing", persistence: this.persistence };
      const status = await this.getStore().status(id);
      return { state: status.state === "available" ? "configured" : status.state, persistence: status.persistence };
    } catch { return { state: "unavailable", persistence: this.persistence }; }
  }
  async configure(secret: string): Promise<boolean> {
    if (this.busy || this.disposed) return false;
    this.busy = true;
    this.disconnect();
    try {
      // A failed read must not authorize overwriting an unknown selection.
      const id = await this.selection.read();
      const store = this.getStore();
      if (id !== null) {
        const result = await store.replace(id, secret);
        if (result.ok === true) return true;
        if (result.code !== "CREDENTIAL_MISSING") return false;
      }
      const saved = await store.store(secret);
      if (!saved.ok) return false;
      try { await this.selection.write(saved.id); return true; }
      catch {
        // A crash between save and publication can leave an encrypted orphan.
        // Ordinary publication failure best-effort removes the unselected record.
        await store.forget(saved.id).catch(() => {});
        return false;
      }
    } catch { return false; }
    finally { this.busy = false; }
  }
  async forget(): Promise<boolean> {
    if (this.busy || this.disposed) return false;
    this.busy = true;
    this.disconnect();
    try {
      const id = await this.selection.read();
      if (id !== null && !(await this.getStore().forget(id)).ok) return false;
      // If clearing fails after deletion, retain the reference (now missing) so
      // recovery remains explicit; never claim a failed Forget succeeded.
      await this.selection.write(null);
      return true;
    } catch { return false; }
    finally { this.busy = false; }
  }
  async connect(): Promise<boolean> {
    if (this.busy || this.disposed || this.connecting) return false;
    this.connecting = true;
    const epoch = ++this.epoch;
    let timer: ReturnType<typeof setTimeout>;
    const cancellation = new Promise<boolean>((resolve) => {
      this.cancelConnect = () => { if (epoch === this.epoch) this.epoch++; resolve(false); };
      timer = setTimeout(() => { this.cancelConnect?.(); this.output.disconnect(); }, 15_000);
    });
    const work = async () => {
    try {
      const id = await this.selection.read();
      if (!id || epoch !== this.epoch) return false;
      let connected = false;
      const used = await this.getStore().use(id, async (secret) => {
        if (epoch === this.epoch && !this.disposed) connected = await this.output.connect(secret);
      });
      return used.ok && connected && epoch === this.epoch;
    } catch { return false; }
    };
    const pending = work().finally(() => { this.connecting = false; });
    try { return await Promise.race([pending, cancellation]); }
    finally { clearTimeout(timer); this.cancelConnect = undefined; }
  }
  disconnect(): void { this.cancelConnect?.(); this.epoch++; this.output.disconnect(); }
  async startup(): Promise<void> {
    if (this.started || this.disposed) return;
    this.started = true;
    const epoch = this.epoch;
    if ((await this.status()).state === "configured" && epoch === this.epoch && !this.disposed) await this.connect();
  }
  dispose(): void { if (!this.disposed) { this.disposed = true; this.disconnect(); this.output.dispose(); } }
}
