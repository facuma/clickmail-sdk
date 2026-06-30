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
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 401, "UNAUTHORIZED", details);
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends ClickMailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 403, "FORBIDDEN", details);
    this.name = "PermissionError";
  }
}

export class RateLimitError extends ClickMailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", details);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends ClickMailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class QuotaExceededError extends ClickMailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 429, "QUOTA_EXCEEDED", details);
    this.name = "QuotaExceededError";
  }
}

export class SandboxRecipientNotVerifiedError extends ClickMailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 403, "SANDBOX_RECIPIENT_NOT_VERIFIED", details);
    this.name = "SandboxRecipientNotVerifiedError";
  }
}

export class DomainNotVerifiedError extends ClickMailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, "DOMAIN_NOT_VERIFIED", details);
    this.name = "DomainNotVerifiedError";
  }
}

export class SuppressedRecipientError extends ClickMailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, "EMAIL_SUPPRESSED", details);
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

const ERROR_CODE_MAP: Partial<Record<ErrorCode, new (message: string, details?: Record<string, unknown>) => ClickMailError>> = {
  UNAUTHORIZED: AuthenticationError,
  FORBIDDEN: PermissionError,
  RATE_LIMIT_EXCEEDED: RateLimitError,
  QUOTA_EXCEEDED: QuotaExceededError,
  SANDBOX_RECIPIENT_NOT_VERIFIED: SandboxRecipientNotVerifiedError,
  DOMAIN_NOT_VERIFIED: DomainNotVerifiedError,
  EMAIL_SUPPRESSED: SuppressedRecipientError,
  VALIDATION_ERROR: ValidationError,
};

export function parseApiError(
  statusCode: number,
  body: ApiErrorBody
): ClickMailError {
  const { code, message, details } = body.error;
  const ErrorClass = ERROR_CODE_MAP[code as ErrorCode];
  if (ErrorClass) {
    return new ErrorClass(message, details);
  }
  return new ApiError(message, statusCode, code, details);
}
