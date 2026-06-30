import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ErrorCode } from "@tribastion/shared";
import { AppError } from "@/lib/app-error";
import { logger } from "@/lib/logger";
import { isProduction } from "@/config/env";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.originalUrl }, err.message);
    }
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: isProduction ? "An unexpected error occurred" : (err as Error)?.message ?? "Unknown error",
    },
  });
}
