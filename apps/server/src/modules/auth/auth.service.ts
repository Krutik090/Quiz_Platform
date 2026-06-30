import argon2 from "argon2";
import { authenticator } from "otplib";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "@/lib/app-error";
import { redis } from "@/lib/redis";
import { env } from "@/config/env";
import { authRepository } from "@/modules/auth/auth.repository";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import type { AdminUserDocument } from "@/modules/auth/auth.model";
import { auditService } from "@/modules/audit/audit.service";
import { ErrorCode, type Role } from "@tribastion/shared";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_PREFIX = "refresh_token:";

function toSafeUser(user: AdminUserDocument) {
  return {
    id: user.id as string,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    mfaEnabled: user.mfaEnabled,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function issueTokenPair(user: AdminUserDocument) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role as Role });
  const jti = uuidv4();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await redis.set(`${REFRESH_TOKEN_PREFIX}${jti}`, user.id, "PX", env.JWT_REFRESH_TTL_MS);

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: { email: string; name: string; password: string; role: Role }, actorId: string) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict("An account with this email already exists");

    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
    const user = await authRepository.create({ ...input, passwordHash });

    await auditService.log({
      actorId,
      action: "admin.register",
      targetType: "AdminUser",
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return toSafeUser(user);
  },

  async login(input: { email: string; password: string; mfaCode?: string }, context: { ip: string; userAgent: string }) {
    const user = await authRepository.findByEmail(input.email);
    if (!user || !user.isActive) throw AppError.unauthorized("Invalid email or password");

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw AppError.unauthorized("Account is temporarily locked due to repeated failed login attempts");
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      throw AppError.unauthorized("Invalid email or password");
    }

    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        throw new AppError(401, ErrorCode.MFA_REQUIRED, "MFA verification code required");
      }
      const validMfa = authenticator.verify({ token: input.mfaCode, secret: user.mfaSecret! });
      if (!validMfa) throw AppError.unauthorized("Invalid MFA code");
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    const tokens = await issueTokenPair(user);

    await auditService.log({
      actorId: user.id,
      action: "admin.login",
      targetType: "AdminUser",
      targetId: user.id,
      metadata: { ip: context.ip, userAgent: context.userAgent },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return { user: toSafeUser(user), ...tokens };
  },

  /**
   * Rotates the refresh token on every use. If the presented jti is not in the active
   * set, it has already been consumed (or never existed) — treat as a replay attack
   * and revoke every outstanding refresh token for the user.
   */
  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    const key = `${REFRESH_TOKEN_PREFIX}${payload.jti}`;
    const storedUserId = await redis.get(key);

    if (!storedUserId || storedUserId !== payload.sub) {
      await this.revokeAllForUser(payload.sub);
      throw AppError.unauthorized("Refresh token reuse detected — all sessions revoked");
    }

    await redis.del(key);

    const user = await authRepository.findById(payload.sub);
    if (!user || !user.isActive) throw AppError.unauthorized("Account is no longer active");

    return issueTokenPair(user);
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await redis.del(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
    } catch {
      // Token already invalid/expired — nothing to revoke.
    }
  },

  async revokeAllForUser(userId: string): Promise<void> {
    const stream = redis.scanStream({ match: `${REFRESH_TOKEN_PREFIX}*`, count: 100 });
    const keysToCheck: string[] = [];
    for await (const keys of stream) {
      keysToCheck.push(...(keys as string[]));
    }
    if (keysToCheck.length === 0) return;
    const values = await redis.mget(...keysToCheck);
    const staleKeys = keysToCheck.filter((_, i) => values[i] === userId);
    if (staleKeys.length > 0) await redis.del(...staleKeys);
  },

  async enrollMfaStart(userId: string) {
    const user = await authRepository.findByIdWithSecrets(userId);
    if (!user) throw AppError.notFound("User not found");

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, env.MFA_ISSUER, secret);
    return { secret, otpauthUrl };
  },

  async enrollMfaVerify(userId: string, secret: string, code: string) {
    const valid = authenticator.verify({ token: code, secret });
    if (!valid) throw AppError.badRequest("Invalid MFA code");

    const user = await authRepository.findByIdWithSecrets(userId);
    if (!user) throw AppError.notFound("User not found");

    user.mfaSecret = secret;
    user.mfaEnabled = true;
    await user.save();

    await auditService.log({ actorId: userId, action: "admin.mfa_enabled", targetType: "AdminUser", targetId: userId });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await authRepository.findByIdWithSecrets(userId);
    if (!user) throw AppError.notFound("User not found");

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw AppError.unauthorized("Current password is incorrect");

    user.passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await user.save();
    await this.revokeAllForUser(userId);

    await auditService.log({ actorId: userId, action: "admin.password_changed", targetType: "AdminUser", targetId: userId });
  },

  toSafeUser,
};
