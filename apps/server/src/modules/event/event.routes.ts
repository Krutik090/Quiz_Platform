import { Router } from "express";
import { z } from "zod";
import { startEventSchema, Role } from "@tribastion/shared";
import { eventController } from "@/modules/event/event.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/lib/async-handler";

export const eventRouter = Router();

eventRouter.use(requireAuth, requireRole(Role.MODERATOR));

const idParamSchema = z.object({ id: z.string().min(1).max(64) });
const quizIdParamSchema = z.object({ quizId: z.string().min(1).max(64) });

eventRouter.post("/", validate({ body: startEventSchema }), asyncHandler(eventController.create));
eventRouter.get("/:id", validate({ params: idParamSchema }), asyncHandler(eventController.get));
eventRouter.get("/:id/qr", validate({ params: idParamSchema }), asyncHandler(eventController.qrCode));
eventRouter.get("/by-quiz/:quizId", validate({ params: quizIdParamSchema }), asyncHandler(eventController.listForQuiz));

export const publicEventRouter = Router();
publicEventRouter.get(
  "/by-code/:joinCode",
  validate({ params: z.object({ joinCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/) }) }),
  asyncHandler(eventController.lookupByJoinCode),
);
