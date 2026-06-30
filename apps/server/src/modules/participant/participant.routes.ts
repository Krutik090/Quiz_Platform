import { Router } from "express";
import { z } from "zod";
import { joinEventSchema, Role } from "@tribastion/shared";
import { participantController } from "@/modules/participant/participant.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { joinRateLimiter } from "@/middleware/security.middleware";
import { asyncHandler } from "@/lib/async-handler";

export const publicParticipantRouter = Router();
publicParticipantRouter.post("/join", joinRateLimiter, validate({ body: joinEventSchema }), asyncHandler(participantController.join));

export const participantRouter = Router();
participantRouter.use(requireAuth, requireRole(Role.MODERATOR));
participantRouter.get(
  "/by-event/:eventId",
  validate({ params: z.object({ eventId: z.string().min(1).max(64) }) }),
  asyncHandler(participantController.listForEvent),
);
