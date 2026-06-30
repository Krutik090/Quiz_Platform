import { useEffect } from "react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { ensureCsrfToken } from "@/lib/api-client";
import { authApi } from "@/features/auth/auth.api";

/** On app load, silently exchange the HTTP-only refresh cookie (if any) for a fresh access token. */
export function useBootstrapAuth() {
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await ensureCsrfToken();
        const { data } = await axios.post<{ accessToken: string }>(
          "/api/auth/refresh",
          {},
          { withCredentials: true, headers: { "X-CSRF-Token": token } },
        );
        if (cancelled) return;
        useAuthStore.getState().setAccessToken(data.accessToken);
        const user = await authApi.me();
        if (!cancelled) setSession(user, data.accessToken);
      } catch {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
