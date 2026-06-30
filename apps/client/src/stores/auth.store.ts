import { create } from "zustand";
import type { SafeAdminUser } from "@tribastion/shared";

interface AuthState {
  user: SafeAdminUser | null;
  /** Held only in memory — never persisted to localStorage/sessionStorage to limit XSS blast radius. */
  accessToken: string | null;
  isHydrating: boolean;
  setSession: (user: SafeAdminUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setHydrating: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrating: true,
  setSession: (user, accessToken) => set({ user, accessToken, isHydrating: false }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setHydrating: (value) => set({ isHydrating: value }),
  clear: () => set({ user: null, accessToken: null, isHydrating: false }),
}));
