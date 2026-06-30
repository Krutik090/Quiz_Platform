import type { Role } from "../constants/roles";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  mfaEnabled: boolean;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Public-safe representation returned by the API and stored in client state. */
export type SafeAdminUser = Omit<AdminUser, never>;

export interface AuthTokens {
  accessToken: string;
  /** Refresh token is never exposed in JSON — it lives only in an HTTP-only cookie. */
  accessTokenExpiresAt: string;
}
