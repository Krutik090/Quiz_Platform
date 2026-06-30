import { Router } from "express";
import type { Request, Response } from "express";
import { Role } from "@tribastion/shared";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { auditService } from "@/modules/audit/audit.service";
import { asyncHandler } from "@/lib/async-handler";

export const auditRouter = Router();

auditRouter.get(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const result = await auditService.list(
      {
        actorId: req.query.actorId as string | undefined,
        targetType: req.query.targetType as string | undefined,
        action: req.query.action as string | undefined,
      },
      page,
      limit,
    );
    res.status(200).json(result);
  }),
);
