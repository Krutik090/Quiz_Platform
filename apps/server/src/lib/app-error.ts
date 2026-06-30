import { ErrorCode } from "@tribastion/shared";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, ErrorCode.VALIDATION_ERROR, message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new AppError(401, ErrorCode.UNAUTHORIZED, message);
  }
  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, ErrorCode.FORBIDDEN, message);
  }
  static notFound(message = "Resource not found") {
    return new AppError(404, ErrorCode.NOT_FOUND, message);
  }
  static conflict(message: string) {
    return new AppError(409, ErrorCode.CONFLICT, message);
  }
  static tooManyRequests(message = "Too many requests") {
    return new AppError(429, ErrorCode.RATE_LIMITED, message);
  }
  static internal(message = "An unexpected error occurred") {
    return new AppError(500, ErrorCode.INTERNAL_ERROR, message);
  }
}
