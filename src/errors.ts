import type { ApiErrorBody, ErrorCode } from "../types/errors.js";

export class ClickMailError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ClickMailError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 401
  ) {
    super(message, statusCode, "UNAUTHORIZED", details);
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 403
  ) {
    super(message, statusCode, "FORBIDDEN", details);
    this.name = "PermissionError";
  }
}

export class RateLimitError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 429
  ) {
    super(message, statusCode, "RATE_LIMIT_EXCEEDED", details);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 400
  ) {
    super(message, statusCode, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class QuotaExceededError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 429
  ) {
    super(message, statusCode, "QUOTA_EXCEEDED", details);
    this.name = "QuotaExceededError";
  }
}

export class SandboxRecipientNotVerifiedError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 403
  ) {
    super(message, statusCode, "SANDBOX_RECIPIENT_NOT_VERIFIED", details);
    this.name = "SandboxRecipientNotVerifiedError";
  }
}

export class DomainNotVerifiedError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 422
  ) {
    super(message, statusCode, "DOMAIN_NOT_VERIFIED", details);
    this.name = "DomainNotVerifiedError";
  }
}

export class SuppressedRecipientError extends ClickMailError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    statusCode = 422
  ) {
    super(message, statusCode, "EMAIL_SUPPRESSED", details);
    this.name = "SuppressedRecipientError";
  }
}

export class ApiError extends ClickMailError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, statusCode, code, details);
    this.name = "ApiError";
  }
}

type TypedErrorClass = new (
  message: string,
  details?: Record<string, unknown>,
  statusCode?: number
) => ClickMailError;

const ERROR_CODE_MAP: Partial<Record<ErrorCode, TypedErrorClass>> = {
  UNAUTHORIZED: AuthenticationError,
  FORBIDDEN: PermissionError,
  RATE_LIMIT_EXCEEDED: RateLimitError,
  QUOTA_EXCEEDED: QuotaExceededError,
  SANDBOX_RECIPIENT_NOT_VERIFIED: SandboxRecipientNotVerifiedError,
  DOMAIN_NOT_VERIFIED: DomainNotVerifiedError,
  EMAIL_SUPPRESSED: SuppressedRecipientError,
  VALIDATION_ERROR: ValidationError,
};

// Used when the body carries no recognized `code` (e.g. NestJS default errors).
const STATUS_ERROR_MAP: Partial<Record<number, TypedErrorClass>> = {
  400: ValidationError,
  401: AuthenticationError,
  403: PermissionError,
  422: ValidationError,
  429: RateLimitError,
};

export function parseApiError(
  statusCode: number,
  body: ApiErrorBody
): ClickMailError {
  const { code, message, details } = body.error;
  const ErrorClass = ERROR_CODE_MAP[code as ErrorCode];
  if (ErrorClass) {
    return new ErrorClass(message, details, statusCode);
  }
  return new ApiError(message, statusCode, code, details);
}

/**
 * Builds the error for a non-2xx response. Accepts the nested shape
 * `{ error: { code, message } }`, a top-level `{ code, message }` and the
 * NestJS default `{ statusCode, message, error }`, falling back on the HTTP
 * status when there is no code.
 */
export function errorFromResponse(
  statusCode: number,
  statusText: string,
  body: unknown
): ClickMailError {
  const fallbackMessage = `HTTP ${statusCode}: ${statusText}`;
  if (!isObject(body)) {
    return errorFromStatus(statusCode, fallbackMessage);
  }

  const source = isObject(body.error) ? body.error : body;
  const message = readMessage(source.message) ?? fallbackMessage;
  const details = isObject(source.details)
    ? source.details
    : Array.isArray(source.message)
      ? { messages: source.message }
      : undefined;

  if (typeof source.code === "string" && source.code !== "") {
    const error: ApiErrorBody["error"] = { code: source.code, message };
    if (details) error.details = details;
    return parseApiError(statusCode, { error });
  }

  return errorFromStatus(statusCode, message, details);
}

function errorFromStatus(
  statusCode: number,
  message: string,
  details?: Record<string, unknown>
): ClickMailError {
  const ErrorClass = STATUS_ERROR_MAP[statusCode];
  if (ErrorClass) {
    return new ErrorClass(message, details, statusCode);
  }
  return new ApiError(message, statusCode, "API_ERROR", details);
}

function readMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value !== "") return value;
  if (Array.isArray(value) && value.length > 0) return value.map(String).join("; ");
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
