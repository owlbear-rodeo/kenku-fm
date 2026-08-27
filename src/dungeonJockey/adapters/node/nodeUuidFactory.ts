import { randomUUID } from "crypto";

import { UuidFactory } from "../../domain/ids/UuidFactory";

export const nodeUuidFactory: UuidFactory = {
  createUuid: () => randomUUID(),
};
