import { doubleCsrf } from "csrf-csrf";
import { env, isProduction } from "@/config/env";

/**
 * Double-submit-cookie CSRF protection. The token is delivered via a readable cookie
 * and must be echoed back in the X-CSRF-Token header — refresh-token and access-token
 * cookies stay HTTP-only and are never exposed to JS.
 */
export const { doubleCsrfProtection, generateToken: generateCsrfToken } = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  cookieName: isProduction ? "__Host-csrf" : "csrf-token",
  cookieOptions: {
    sameSite: "strict",
    secure: isProduction,
    path: "/",
  },
  getSessionIdentifier: (req) => req.cookies?.refreshToken ?? "anonymous",
});
