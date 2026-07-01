import { useEffect } from "react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/features/auth/auth.api";

/**
 * On every app load / page refresh: exchange the HTTP-only SameSite=strict refresh cookie
 * (if any) for a new access token — no CSRF token required since SameSite=strict makes
 * the cookie unreachable to cross-site requests by itself.
 */
export function useBootstrapAuth() {
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await axios.post<{ accessToken: string }>(
          "/api/auth/refresh",
          {},
          { withCredentials: true },
        );
        if (cancelled) return;

        useAuthStore.getState().setAccessToken(data.accessToken);
        const user = await authApi.me();
        if (!cancelled) setSession(user, data.accessToken);
      } catch {
        // No valid session — user simply needs to log in. Not an error worth logging.
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
