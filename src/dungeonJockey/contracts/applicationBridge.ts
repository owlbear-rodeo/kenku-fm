import type { CredentialId } from "../domain/ids/CredentialId";
import type { CredentialResult } from "./credentials";
import type { VersionResult } from "./version";

export interface ApplicationBridge {
  getVersion(): Promise<VersionResult>;
  storeCredential(secret: string): Promise<CredentialResult<"store">>;
  getCredentialStatus(id: CredentialId): Promise<CredentialResult<"status">>;
  replaceCredential(id: CredentialId, secret: string): Promise<CredentialResult<"replace">>;
  forgetCredential(id: CredentialId): Promise<CredentialResult<"forget">>;
}
