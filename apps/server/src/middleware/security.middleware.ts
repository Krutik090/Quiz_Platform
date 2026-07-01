import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import { env, isProduction } from "@/config/env";
import { AppError } from "@/lib/app-error";

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      // CLIENT_URL is documented as a single URL, but Helmet hard-crashes the process if any
      // CSP source token isn't a valid single expression — splitting defensively means a
      // misconfigured (e.g. comma-joined) value degrades gracefully instead of taking the
      // whole server down.
      connectSrc: ["'self'", ...env.CLIENT_URL.split(",").map((o) => o.trim())],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
});

export const hppMiddleware = hpp();

export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: "_",
});

/** Strips NoSQL-injection operators ($gt, $where, etc.) and prototype-pollution keys from any object the client controls. */
export function stripDangerousKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripDangerousKeys(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key === "__proto__" || key === "constructor" || key === "prototype") continue;
      out[key] = stripDangerousKeys(val);
    }
    return out as T;
  }
  return value;
}

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(AppError.tooManyRequests("Too many authentication attempts, please try again later")),
});

export const joinRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});
