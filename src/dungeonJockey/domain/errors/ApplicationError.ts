export type ApplicationErrorDetailValue =
  | null
  | boolean
  | number
  | string
  | readonly ApplicationErrorDetailValue[]
  | { readonly [key: string]: ApplicationErrorDetailValue };

export type SerializedApplicationError = Readonly<{
  code: string;
  message: string;
  retryable: boolean;
  details?: Readonly<Record<string, ApplicationErrorDetailValue>>;
}>;

export type ApplicationErrorOptions = Readonly<{
  retryable?: boolean;
  details?: unknown;
  cause?: unknown;
}>;

function cloneSafeDetail(
  value: unknown,
  ancestors: WeakSet<object>,
): ApplicationErrorDetailValue {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError("Application error details must be JSON-safe");
  }
  if (ancestors.has(value)) {
    throw new TypeError("Application error details must not be circular");
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
        throw new TypeError(
          "Application error detail arrays must contain only dense data fields",
        );
      }

      const result: ApplicationErrorDetailValue[] = [];
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
          throw new TypeError(
            "Application error detail arrays must contain only dense data fields",
          );
        }
        result.push(cloneSafeDetail(descriptor.value, ancestors));
      }
      return Object.freeze(result);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Application error details must use plain objects");
    }

    const result: Record<string, ApplicationErrorDetailValue> = {};
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        typeof key !== "string" ||
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        throw new TypeError("Application error details contain unsafe fields");
      }
      Object.defineProperty(result, key, {
        value: cloneSafeDetail(descriptor.value, ancestors),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return Object.freeze(result);
  } finally {
    ancestors.delete(value);
  }
}

function cloneSafeDetails(
  details: unknown,
): Readonly<Record<string, ApplicationErrorDetailValue>> {
  const cloned = cloneSafeDetail(details, new WeakSet());
  if (cloned === null || Array.isArray(cloned) || typeof cloned !== "object") {
    throw new TypeError("Application error details must be a plain object");
  }
  return cloned as Readonly<Record<string, ApplicationErrorDetailValue>>;
}

export class ApplicationError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, ApplicationErrorDetailValue>>;
  private readonly internalCause?: unknown;

  constructor(code: string, message: string, options: ApplicationErrorOptions = {}) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
      throw new TypeError("Application error code must be stable uppercase text");
    }
    if (message.trim().length === 0) {
      throw new TypeError("Application error message must not be empty");
    }

    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details =
      options.details === undefined
        ? undefined
        : cloneSafeDetails(options.details);
    Object.defineProperty(this, "internalCause", {
      value: options.cause,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  getCauseForLocalDebugging(): unknown {
    return this.internalCause;
  }

  toJSON(): SerializedApplicationError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }

  static fromUnknown(failure: unknown): ApplicationError {
    if (failure instanceof ApplicationError) {
      return failure;
    }

    return new ApplicationError(
      "UNEXPECTED_FAILURE",
      "An unexpected application error occurred.",
      { cause: failure },
    );
  }
}
