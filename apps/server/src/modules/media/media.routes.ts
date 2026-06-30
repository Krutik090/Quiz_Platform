import { Router } from "express";
import type { Request, Response } from "express";
import { Role } from "@tribastion/shared";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { mediaUpload } from "@/modules/media/upload.middleware";
import { AppError } from "@/lib/app-error";
import { asyncHandler } from "@/lib/async-handler";

export const mediaRouter = Router();

mediaRouter.post(
  "/upload",
  requireAuth,
  requireRole(Role.MODERATOR),
  mediaUpload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest("No file provided");
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
  }),
);
