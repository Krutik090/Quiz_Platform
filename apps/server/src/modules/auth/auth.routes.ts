import { Router } from "express";
import {
  loginSchema,
  registerAdminSchema,
  changePasswordSchema,
  mfaEnrollVerifySchema,
  Role,
} from "@tribastion/shared";
import { authController } from "@/modules/auth/auth.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { authRateLimiter } from "@/middleware/security.middleware";
import { doubleCsrfProtection } from "@/middleware/csrf.middleware";
import { asyncHandler } from "@/lib/async-handler";

export const authRouter = Router();

authRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
// refresh/logout rely on the ambient refresh-token cookie, so they're the only routes that need CSRF double-submit defense.
authRouter.post("/refresh", doubleCsrfProtection, asyncHandler(authController.refresh));
authRouter.post("/logout", doubleCsrfProtection, asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));

authRouter.post(
  "/register",
  requireAuth,
  requireRole(Role.SUPER_ADMIN),
  validate({ body: registerAdminSchema }),
  asyncHandler(authController.register),
);

authRouter.post(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);

authRouter.post("/mfa/enroll/start", requireAuth, asyncHandler(authController.mfaEnrollStart));
authRouter.post(
  "/mfa/enroll/verify",
  requireAuth,
  validate({ body: mfaEnrollVerifySchema }),
  asyncHandler(authController.mfaEnrollVerify),
);
