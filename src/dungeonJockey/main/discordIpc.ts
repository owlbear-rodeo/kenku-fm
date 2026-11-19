import type { IpcMainInvokeEvent } from "electron";
import { DISCORD_OPERATIONS, DiscordOperation, DiscordResult, parseDiscordRequest, projectConfiguration, projectDiscordSnapshot } from "../contracts/discord";
import type { RequestId } from "../domain/ids/ids";
import type { DiscordOutputPort } from "../ports/DiscordOutputPort";
import type { DiscordConfigurationService } from "./DiscordConfigurationService";
import { RendererRoleRegistry } from "./RendererRoleRegistry";

export const DISCORD_IPC_TIMEOUT_MS = 20_000;
export const MAX_OUTSTANDING_DISCORD_OPERATIONS = 8;
export type DiscordServices = { configuration: DiscordConfigurationService; output: DiscordOutputPort };
export function createDiscordHandlers(registry: RendererRoleRegistry, getServices: () => DiscordServices) {
  let outstanding = 0;
  let disposed = false;
  const cancellations = new Set<() => void>();
  return {
    handler(operation: DiscordOperation) {
      return async (event: IpcMainInvokeEvent, ...args: unknown[]): Promise<DiscordResult> => {
        const fail = (code: string, id: RequestId | null = null): DiscordResult => ({
          ok: false, protocolVersion: 1, type: DISCORD_OPERATIONS[operation], id,
          error: { code, message: code === "IPC_FORBIDDEN" ? "This operation is not permitted." :
            code === "IPC_INVALID_REQUEST" ? "The Discord request is invalid." :
              code === "IPC_BUSY" ? "Discord operations are busy." : "The Discord operation could not complete.", retryable: code === "IPC_BUSY" },
        });
        if (disposed || !registry.authorizes(event, ["application"])) return fail("IPC_FORBIDDEN");
        let request: ReturnType<typeof parseDiscordRequest>;
        try {
          if (args.length !== 1) throw new Error();
          request = parseDiscordRequest(args[0], operation);
        } catch { return fail("IPC_INVALID_REQUEST"); }
        if (outstanding >= MAX_OUTSTANDING_DISCORD_OPERATIONS) return fail("IPC_BUSY", request.id);
        outstanding++;
        let cancelled = false;
        let cancel: () => void;
        let timer: ReturnType<typeof setTimeout>;
        const base = { ok: true as const, protocolVersion: 1 as const, type: DISCORD_OPERATIONS[operation], id: request.id };
        const work = async (): Promise<DiscordResult> => {
          try {
            const { configuration, output } = getServices();
            const payload = request.payload;
            if (operation === "configuration") return { ...base, configuration: projectConfiguration(await configuration.status()) };
            if (operation === "status") return { ...base, snapshot: projectDiscordSnapshot(output.snapshot()) };
            let ok = true;
            if (operation === "configure") ok = await configuration.configure(payload.secret as string);
            if (operation === "forget") ok = await configuration.forget();
            if (operation === "connect") ok = await configuration.connect();
            if (operation === "disconnect") configuration.disconnect();
            if (operation === "join") ok = await output.join(payload.guildId as string, payload.channelId as string);
            if (operation === "leave") output.leave(payload.guildId as string, payload.channelId as string);
            if (!ok || cancelled) return fail("DISCORD_UNAVAILABLE", request.id);
            return base;
          } catch { return fail("DISCORD_UNAVAILABLE", request.id); }
          finally { outstanding--; }
        };
        const cancellation = new Promise<DiscordResult>((resolve) => {
          cancel = () => { cancelled = true; resolve(fail("DISCORD_UNAVAILABLE", request.id)); };
          cancellations.add(cancel);
          timer = setTimeout(cancel, DISCORD_IPC_TIMEOUT_MS);
        });
        // Timed-out filesystem work retains its admission slot until it settles:
        // a stalled native provider cannot accumulate unbounded queued secrets.
        try {
          const result = await Promise.race([work(), cancellation]);
          return disposed || !registry.authorizes(event, ["application"]) ? fail("IPC_FORBIDDEN") : result;
        } finally { clearTimeout(timer); cancellations.delete(cancel); }
      };
    },
    dispose() { disposed = true; for (const cancel of cancellations) cancel(); cancellations.clear(); },
  };
}
