import { redirect } from "next/navigation";
import { authenticatedDestination } from "@/lib/auth-navigation";
import { safeAuthCallback } from "@/lib/auth-redirect";
import { getCurrentSession } from "@/lib/development-user";
export const instant = false;
export default async function AuthContinuePage({ searchParams }: { searchParams: Promise<{ callbackURL?: string | string[] }> }) { const params = await searchParams; const callbackURL = safeAuthCallback(params.callbackURL, "/dashboard"); const destination = authenticatedDestination(await getCurrentSession(), callbackURL); redirect(destination || `/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`); }
