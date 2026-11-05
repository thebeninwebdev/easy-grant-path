import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { authenticatedDestination } from "@/lib/auth-navigation";
import { getCurrentSession } from "@/lib/development-user";
export const instant = false; export const metadata: Metadata = { title: "Create account" };
export default async function SignUpPage() { const destination = authenticatedDestination(await getCurrentSession()); if (destination) redirect(destination); return <AuthShell title="Create your account" description="Join EasyGrantPath and discover funding opportunities tailored to your goals."><AuthForm mode="sign-up" /></AuthShell>; }
