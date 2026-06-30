import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@tribastion/shared";
import { env } from "@/config/env";

// JWT_ACCESS_TTL/JWT_REFRESH_TTL are operator-configured duration strings (e.g. "15m");
// jsonwebtoken's types want its own branded StringValue, so cast at the one point we use them.
const accessTokenExpiry = env.JWT_ACCESS_TTL as SignOptions["expiresIn"];
const refreshTokenExpiry = env.JWT_REFRESH_TTL as SignOptions["expiresIn"];

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  /** Unique id per refresh token, stored in Redis so it can be revoked and replay can be detected. */
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: accessTokenExpiry, algorithm: "HS256" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: refreshTokenExpiry, algorithm: "HS256" });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshTokenPayload;
}

/** Short-lived token handed to a participant after REST join, exchanged for a Socket.IO connection. */
export interface SocketJoinTokenPayload {
  sub: string; // participantId
  eventId: string;
}

export function signSocketJoinToken(payload: SocketJoinTokenPayload): string {
  return jwt.sign(payload, env.SOCKET_JOIN_TOKEN_SECRET, { expiresIn: "2h", algorithm: "HS256" });
}

export function verifySocketJoinToken(token: string): SocketJoinTokenPayload {
  return jwt.verify(token, env.SOCKET_JOIN_TOKEN_SECRET, { algorithms: ["HS256"] }) as SocketJoinTokenPayload;
}
