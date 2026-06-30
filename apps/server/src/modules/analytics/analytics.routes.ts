import { Router } from "express";
import { z } from "zod";
import { Role } from "@tribastion/shared";
import { analyticsController } from "@/modules/analytics/analytics.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/lib/async-handler";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireRole(Role.VIEWER));

const eventIdParamSchema = z.object({ eventId: z.string().min(1).max(64) });
const exportParamSchema = eventIdParamSchema.extend({ format: z.enum(["csv", "xlsx", "pdf"]) });

analyticsRouter.get("/events/:eventId", validate({ params: eventIdParamSchema }), asyncHandler(analyticsController.getEventAnalytics));
analyticsRouter.get(
  "/events/:eventId/export/:format",
  validate({ params: exportParamSchema }),
  asyncHandler(analyticsController.exportEventAnalytics),
);
