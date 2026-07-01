import type { SafeAdminUser } from "@tribastion/shared";
import { apiClient } from "@/lib/api-client";

export interface LoginPayload {
  email: string;
  password: string;
  mfaCode?: string;
}

export const authApi = {
  async login(payload: LoginPayload) {
    const { data } = await apiClient.post<{ user: SafeAdminUser; accessToken: string }>("/auth/login", payload);
    return data;
  },

  async logout() {
    await apiClient.post("/auth/logout", {});
  },

  async me() {
    const { data } = await apiClient.get<{ user: SafeAdminUser }>("/auth/me");
    return data.user;
  },

  async mfaEnrollStart() {
    const { data } = await apiClient.post<{ secret: string; otpauthUrl: string }>("/auth/mfa/enroll/start");
    return data;
  },

  async mfaEnrollVerify(secret: string, code: string) {
    await apiClient.post("/auth/mfa/enroll/verify", { secret, code });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    await apiClient.post("/auth/change-password", { currentPassword, newPassword });
  },
};
