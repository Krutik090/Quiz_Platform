import { Router } from "express";
import { z } from "zod";
import { createQuizSchema, updateQuizSchema, replaceQuestionsSchema, Role } from "@tribastion/shared";
import { quizController } from "@/modules/quiz/quiz.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/lib/async-handler";

export const quizRouter = Router();

quizRouter.use(requireAuth, requireRole(Role.MODERATOR));

const idParamSchema = z.object({ id: z.string().min(1).max(64) });

quizRouter.post("/", validate({ body: createQuizSchema }), asyncHandler(quizController.create));
quizRouter.get("/", asyncHandler(quizController.list));
quizRouter.get("/:id", validate({ params: idParamSchema }), asyncHandler(quizController.get));
quizRouter.patch("/:id", validate({ params: idParamSchema, body: updateQuizSchema }), asyncHandler(quizController.update));
quizRouter.put(
  "/:id/questions",
  validate({ params: idParamSchema, body: replaceQuestionsSchema }),
  asyncHandler(quizController.replaceQuestions),
);
quizRouter.post("/:id/publish", validate({ params: idParamSchema }), asyncHandler(quizController.publish));
quizRouter.delete("/:id", requireRole(Role.ADMIN), validate({ params: idParamSchema }), asyncHandler(quizController.remove));
