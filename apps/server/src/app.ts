import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";
import path from "path";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import {
  corsMiddleware,
  helmetMiddleware,
  hppMiddleware,
  mongoSanitizeMiddleware,
  generalRateLimiter,
} from "@/middleware/security.middleware";
import { generateCsrfToken } from "@/middleware/csrf.middleware";
import { errorHandler, notFoundHandler } from "@/middleware/error-handler.middleware";
import { authRouter } from "@/modules/auth/auth.routes";
import { quizRouter } from "@/modules/quiz/quiz.routes";
import { eventRouter, publicEventRouter } from "@/modules/event/event.routes";
import { participantRouter, publicParticipantRouter } from "@/modules/participant/participant.routes";
import { analyticsRouter } from "@/modules/analytics/analytics.routes";
import { auditRouter } from "@/modules/audit/audit.routes";
import { mediaRouter } from "@/modules/media/media.routes";
import { uploadRoot } from "@/modules/media/upload.middleware";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(hppMiddleware);
  app.use(mongoSanitizeMiddleware);
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));
  app.use(generalRateLimiter);

  app.use("/uploads", express.static(path.resolve(process.cwd(), uploadRoot)));

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  // Every protected /api/* route authenticates via an explicit Authorization: Bearer header,
  // which a cross-site CSRF request cannot forge, so double-submit CSRF protection is only
  // needed where the browser sends credentials *automatically* — the refresh-token cookie
  // endpoints in auth.routes.ts. It's applied there directly rather than globally here.
  app.get("/api/csrf-token", (req, res) => {
    res.status(200).json({ csrfToken: generateCsrfToken(req, res) });
  });

  app.use("/api/public/events", publicEventRouter);
  app.use("/api/public/participants", publicParticipantRouter);
  app.use("/api/auth", authRouter);

  app.use("/api/quizzes", quizRouter);
  app.use("/api/events", eventRouter);
  app.use("/api/participants", participantRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/audit-logs", auditRouter);
  app.use("/api/media", mediaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
