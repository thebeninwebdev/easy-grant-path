import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { authenticatedDestination } from "@/lib/auth-navigation";
import { safeAuthCallback } from "@/lib/auth-redirect";
import { getCurrentSession } from "@/lib/development-user";
export const instant = false; export const metadata: Metadata = { title: "Sign in" };
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackURL?: string | string[] }> }) { const params = await searchParams; const destination = authenticatedDestination(await getCurrentSession(), params.callbackURL); if (destination) redirect(destination); return <AuthShell title="Welcome back" description="Sign in to continue your funding journey."><AuthForm mode="sign-in" callbackURL={safeAuthCallback(params.callbackURL, "/dashboard")} /></AuthShell>; }
