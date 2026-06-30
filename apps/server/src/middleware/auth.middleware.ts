import type { NextFunction, Request, Response } from "express";
import { roleAtLeast, type Role } from "@tribastion/shared";
import { verifyAccessToken } from "@/lib/jwt";
import { AppError } from "@/lib/app-error";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(AppError.unauthorized());
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired access token"));
  }
}

export function requireRole(minimumRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roleAtLeast(req.user.role, minimumRole)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
