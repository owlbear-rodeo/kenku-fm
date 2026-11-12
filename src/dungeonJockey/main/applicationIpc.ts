import type { IpcMain, IpcMainInvokeEvent, WebContents } from "electron";
import { ApplicationError } from "../domain/errors/ApplicationError";
import type { RequestId } from "../domain/ids/ids";
import {
  parseVersionRequest,
  VERSION_CHANNEL,
  VersionResult,
} from "../contracts/version";
import {
  ApplicationEntryPolicy,
  isExternalApplicationLink,
} from "./applicationEntryPolicy";
import { RendererRoleRegistry } from "./RendererRoleRegistry";

const VERSION_ROLES: readonly string[] = Object.freeze(["application"]);

function failure(
  code: string,
  message: string,
  id: RequestId | null = null,
): VersionResult {
  return {
    ok: false,
    protocolVersion: 1,
    id,
    error: new ApplicationError(code, message).toJSON(),
  };
}

export function createVersionHandler(
  registry: RendererRoleRegistry,
  getVersion: () => string,
): (event: IpcMainInvokeEvent, ...args: unknown[]) => VersionResult {
  return (event, ...args) => {
    if (!registry.authorizes(event, VERSION_ROLES)) {
      return failure("IPC_FORBIDDEN", "This operation is not permitted.");
    }
    let id: RequestId;
    try {
      if (args.length !== 1) throw new Error("Invalid argument count");
      id = parseVersionRequest(args[0]).id;
    } catch {
      return failure("IPC_INVALID_REQUEST", "The version request is invalid.");
    }
    try {
      const version = getVersion();
      if (
        typeof version !== "string" ||
        version.length === 0 ||
        version.length > 128
      ) {
        throw new Error("Invalid version result");
      }
      return { ok: true, protocolVersion: 1, id, version };
    } catch {
      return failure("IPC_UNAVAILABLE", "The version is unavailable.", id);
    }
  };
}

/** One main-lifetime handler, independent of renderer compatibility sessions. */
export function createApplicationIpc(ipc: IpcMain, getVersion: () => string) {
  const registry = new RendererRoleRegistry();
  const windows = new Map<WebContents, () => void>();
  let disposed = false;
  ipc.handle(VERSION_CHANNEL, createVersionHandler(registry, getVersion));

  return {
    bindApplicationWindow(
      contents: WebContents,
      entry: ApplicationEntryPolicy,
      openExternal: (url: string) => void,
    ): () => void {
      if (disposed) throw new Error("Application IPC has been disposed");
      windows.get(contents)?.();
      const revoke = () => registry.revoke(contents);
      const register = () => registry.register(contents, "application", entry);
      const start = (
        details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>,
      ) => {
        if (details.isMainFrame && !details.isSameDocument) revoke();
      };
      const inPage = (
        _event: Electron.Event,
        url: string,
        isMainFrame: boolean,
      ) => {
        // A fragment/history event must never restore a role revoked by a
        // pending navigation, crash or blocked departure. Only a new committed
        // document can do that. Owned same-document moves retain their binding.
        if (isMainFrame && !entry.allows(url)) revoke();
      };
      const navigate = (
        details: Electron.Event<Electron.WebContentsWillNavigateEventParams>,
      ) => {
        if (!entry.allows(details.url)) {
          revoke();
          details.preventDefault();
          if (isExternalApplicationLink(details.url)) openExternal(details.url);
        }
      };
      const redirect = (
        details: Electron.Event<Electron.WebContentsWillRedirectEventParams>,
      ) => {
        if (details.isMainFrame && !entry.allows(details.url)) {
          revoke();
          details.preventDefault();
        }
      };
      let unbound = false;
      const unbind = () => {
        if (unbound) return;
        unbound = true;
        revoke();
        windows.delete(contents);
        contents.removeListener("did-start-navigation", start);
        contents.removeListener("did-navigate", register);
        contents.removeListener("did-navigate-in-page", inPage);
        contents.removeListener("will-navigate", navigate);
        contents.removeListener("will-redirect", redirect);
        contents.removeListener("render-process-gone", revoke);
        contents.removeListener("destroyed", unbind);
        if (!contents.isDestroyed()) {
          contents.setWindowOpenHandler(() => ({ action: "deny" }));
        }
      };
      contents.on("did-start-navigation", start);
      contents.on("did-navigate", register);
      contents.on("did-navigate-in-page", inPage);
      contents.on("will-navigate", navigate);
      contents.on("will-redirect", redirect);
      contents.on("render-process-gone", revoke);
      contents.on("destroyed", unbind);
      contents.setWindowOpenHandler(({ url }) => {
        if (isExternalApplicationLink(url)) openExternal(url);
        return { action: "deny" };
      });
      windows.set(contents, unbind);
      // Bind before loadURL. Only a committed owned document registers a role.
      return unbind;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const unbind of windows.values()) unbind();
      registry.clear();
      ipc.removeHandler(VERSION_CHANNEL);
    },
  };
}
