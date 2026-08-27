export interface RuntimeSchema<TValue> {
  readonly description: string;
  parse(value: unknown): TValue;
}

export class RuntimeSchemaValidationError extends Error {
  constructor(description: string) {
    super(`Value does not match runtime schema: ${description}`);
    this.name = "RuntimeSchemaValidationError";
  }
}

export function createRuntimeSchema<TValue>(
  description: string,
  accepts: (value: unknown) => value is TValue,
): RuntimeSchema<TValue> {
  return Object.freeze({
    description,
    parse(value: unknown): TValue {
      if (!accepts(value)) {
        throw new RuntimeSchemaValidationError(description);
      }
      return value;
    },
  });
}

export function literalStringSchema<TValue extends string>(
  expected: TValue,
): RuntimeSchema<TValue> {
  return createRuntimeSchema(
    JSON.stringify(expected),
    (value): value is TValue => value === expected,
  );
}

function assertSerializableValue(
  value: unknown,
  ancestors: WeakSet<object>,
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RuntimeSchemaValidationError("finite JSON value");
    }
    return;
  }

  if (typeof value !== "object") {
    throw new RuntimeSchemaValidationError("serializable JSON value");
  }

  if (ancestors.has(value)) {
    throw new RuntimeSchemaValidationError("acyclic JSON value");
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        lengthDescriptor === undefined ||
        lengthDescriptor.enumerable ||
        !("value" in lengthDescriptor) ||
        typeof lengthDescriptor.value !== "number" ||
        keys.length !== lengthDescriptor.value + 1
      ) {
        throw new RuntimeSchemaValidationError("dense JSON array fields");
      }

      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (
          descriptor === undefined ||
          !descriptor.enumerable ||
          !("value" in descriptor)
        ) {
          throw new RuntimeSchemaValidationError("dense JSON array fields");
        }
        assertSerializableValue(descriptor.value, ancestors);
      }
      return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new RuntimeSchemaValidationError("plain JSON object");
    }

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        typeof key !== "string" ||
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        throw new RuntimeSchemaValidationError("plain JSON object fields");
      }
      assertSerializableValue(descriptor.value, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

export function assertBoundarySerializable(value: unknown): void {
  assertSerializableValue(value, new WeakSet());
}
