import type { CookieOptions, Request, Response } from "express";
import { authService } from "@/modules/auth/auth.service";
import { authRepository } from "@/modules/auth/auth.repository";
import { AppError } from "@/lib/app-error";
import { env, isProduction } from "@/config/env";

// A plain name (no __Host- prefix) avoids the extra constraints that prefix imposes when
// requests flow through a Cloudflare → Caddy → nginx → Express reverse-proxy chain.
// SameSite=strict is the actual CSRF defence on these routes — the __Host- prefix would
// only add protection against subdomain cookie theft, which is not a threat in this
// single-domain deployment.
const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
  maxAge: env.JWT_REFRESH_TTL_MS,
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions, maxAge: undefined });
}

function accessTokenExpiry(): string {
  // JWT_ACCESS_TTL is a duration string (e.g. "15m"); the client only needs an approximate expiry for proactive refresh.
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, {
      ip: req.ip ?? "unknown",
      userAgent: req.headers["user-agent"] ?? "unknown",
    });
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
      accessTokenExpiresAt: accessTokenExpiry(),
    });
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw AppError.unauthorized("No refresh token provided");

    const result = await authService.refresh(token);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ accessToken: result.accessToken, accessTokenExpiresAt: accessTokenExpiry() });
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) await authService.logout(token);
    clearRefreshCookie(res);
    res.status(204).send();
  },

  async register(req: Request, res: Response) {
    const user = await authService.register(req.body, req.user!.id);
    res.status(201).json({ user });
  },

  async me(req: Request, res: Response) {
    const user = await authRepository.findById(req.user!.id);
    if (!user) throw AppError.notFound("User not found");
    res.status(200).json({ user: authService.toSafeUser(user) });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    clearRefreshCookie(res);
    res.status(204).send();
  },

  async mfaEnrollStart(req: Request, res: Response) {
    const result = await authService.enrollMfaStart(req.user!.id);
    res.status(200).json(result);
  },

  async mfaEnrollVerify(req: Request, res: Response) {
    await authService.enrollMfaVerify(req.user!.id, req.body.secret, req.body.code);
    res.status(204).send();
  },
};
