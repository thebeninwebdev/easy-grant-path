import "server-only";
import { hasAdminRole } from "@/lib/admin-auth";
import { safeAuthCallback } from "@/lib/auth-redirect";

type SessionLike = { user?: { emailVerified?: boolean; role?: string | null } } | null;

export function hasActiveSession(session: SessionLike) {
  return Boolean(session?.user?.emailVerified);
}

export function authenticatedDestination(session: SessionLike, callbackURL?: string | string[]) {
  if (!hasActiveSession(session)) return null;
  const callback = safeAuthCallback(callbackURL, "/dashboard");
  return /^\/(?:en\/|fr\/)?dashboard(?:[/?]|$)/.test(callback) ? callback : "/dashboard";
}
