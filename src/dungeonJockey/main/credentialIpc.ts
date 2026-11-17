import type { IpcMainInvokeEvent } from "electron";
import { ApplicationError } from "../domain/errors/ApplicationError";
import { parseCredentialId } from "../domain/ids/CredentialId";
import type { RequestId } from "../domain/ids/ids";
import type { SecretStorePort } from "../ports/SecretStorePort";
import {
  CREDENTIAL_OPERATIONS,
  CredentialOperation,
  CredentialRequest,
  CredentialResult,
  parseCredentialPersistence,
  parseCredentialRequest,
  parseCredentialResult,
} from "../contracts/credentials";
import { RendererRoleRegistry } from "./RendererRoleRegistry";

/** Includes dispatched and store-queued work across all credential operations. */
export const MAX_OUTSTANDING_CREDENTIAL_OPERATIONS = 8;
export type CredentialOperations = Pick<SecretStorePort, "store" | "status" | "replace" | "forget">;
const ROLES = Object.freeze(["application"]);

function failure(operation: CredentialOperation, code: string, message: string, id: RequestId | null = null): CredentialResult {
  return {
    ok: false, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation], id,
    error: new ApplicationError(code, message, { retryable: code === "IPC_BUSY" }).toJSON(),
  };
}

export function createCredentialHandlers(registry: RendererRoleRegistry, getStore: () => CredentialOperations) {
  let outstanding = 0;
  let disposed = false;
  return {
    handler(operation: CredentialOperation) {
      return async (event: IpcMainInvokeEvent, ...args: unknown[]): Promise<CredentialResult> => {
        if (disposed || !registry.authorizes(event, ROLES)) {
          return failure(operation, "IPC_FORBIDDEN", "This operation is not permitted.");
        }
        let request: CredentialRequest;
        try {
          if (args.length !== 1) throw new Error();
          request = parseCredentialRequest(args[0], operation);
        } catch {
          return failure(operation, "IPC_INVALID_REQUEST", "The credential request is invalid.");
        }
        if (outstanding >= MAX_OUTSTANDING_CREDENTIAL_OPERATIONS) {
          return failure(operation, "IPC_BUSY", "Credential operations are busy.", request.id);
        }
        outstanding += 1;
        try {
          const store = getStore();
          const base = { ok: true as const, protocolVersion: 1 as const, type: request.type, id: request.id };
          if (request.type === CREDENTIAL_OPERATIONS.status) {
            const result = await store.status(request.payload.credentialId);
            // Deliberate projection: no exception, code, extra field or object
            // supplied by the dependency is forwarded to the renderer.
            return parseCredentialResult({ ...base, credentialId: request.payload.credentialId,
              status: { state: result.state, persistence: parseCredentialPersistence(result.persistence) },
            }, operation);
          }
          const result = request.type === CREDENTIAL_OPERATIONS.store
            ? await store.store(request.payload.secret)
            : request.type === CREDENTIAL_OPERATIONS.replace
              ? await store.replace(request.payload.credentialId, request.payload.secret)
              : await store.forget(request.payload.credentialId);
          if (result.ok === false) {
            return result.code === "CREDENTIAL_MISSING"
              ? failure(operation, "CREDENTIAL_MISSING", "The credential is missing.", request.id)
              : failure(operation, "SECRET_UNAVAILABLE", "The credential operation is unavailable.", request.id);
          }
          if (result.ok !== true) throw new Error();
          const returnedId = "id" in result ? result.id : undefined;
          if (request.type === CREDENTIAL_OPERATIONS.store &&
              (typeof returnedId !== "string" || returnedId.length !== 36)) throw new Error();
          const id = request.type === CREDENTIAL_OPERATIONS.store
            ? parseCredentialId(returnedId) : request.payload.credentialId;
          return parseCredentialResult({ ...base, credentialId: id,
            persistence: parseCredentialPersistence(result.persistence),
          }, operation);
        } catch {
          return failure(operation, "SECRET_UNAVAILABLE", "The credential operation is unavailable.", request.id);
        } finally {
          outstanding -= 1;
        }
      };
    },
    dispose() { disposed = true; },
  };
}
