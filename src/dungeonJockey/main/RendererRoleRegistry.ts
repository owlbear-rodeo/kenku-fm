import type {
  IpcMainInvokeEvent,
  Session,
  WebContents,
  WebFrameMain,
} from "electron";
import type { ApplicationEntryPolicy } from "./applicationEntryPolicy";

type Registration = Readonly<{
  role: string;
  session: Session;
  frame: WebFrameMain;
  entry: ApplicationEntryPolicy;
}>;

export class RendererRoleRegistry {
  private readonly registrations = new Map<WebContents, Registration>();

  register(
    contents: WebContents,
    role: string,
    entry: ApplicationEntryPolicy,
  ): void {
    this.revoke(contents);
    if (contents.isDestroyed()) return;
    const frame = contents.mainFrame;
    if (frame.detached || frame.parent !== null || !entry.allows(frame.url))
      return;
    if (!entry.allows(contents.getURL())) return;
    this.registrations.set(contents, {
      role,
      session: contents.session,
      frame,
      entry,
    });
  }

  revoke(contents: WebContents): void {
    this.registrations.delete(contents);
  }

  authorizes(event: IpcMainInvokeEvent, roles: readonly string[]): boolean {
    // All identity comes from Electron's receiving event, never request fields.
    try {
      const contents = event.sender;
      const registration = this.registrations.get(contents);
      if (!registration || contents.isDestroyed()) return false;
      const frame = event.senderFrame;
      return (
        roles.includes(registration.role) &&
        contents.session === registration.session &&
        frame !== null &&
        frame === registration.frame &&
        frame === contents.mainFrame &&
        !frame.detached &&
        frame.parent === null &&
        registration.entry.allows(frame.url) &&
        registration.entry.allows(contents.getURL())
      );
    } catch {
      // Electron frame properties can become unavailable during teardown.
      return false;
    }
  }

  clear(): void {
    this.registrations.clear();
  }
}
