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
import { asyncHandler } from "@/lib/async-handler";

export const authRouter = Router();

authRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
// SameSite=strict on the refresh cookie is the actual CSRF defence — a cross-site attacker
// can't trigger a request that includes a SameSite=strict cookie, so CSRF double-submit
// middleware is not needed (and was causing 403s when the __Host- prefix interacted badly
// with the Cloudflare → Caddy → nginx → Express reverse-proxy chain on refresh).
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
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
