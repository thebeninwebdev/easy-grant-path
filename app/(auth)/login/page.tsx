import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession, getUserRole } from "@/lib/auth-session";
import { USER_ROLES } from "@/types/roles";
export const metadata: Metadata = { title: "Sign In" };
export default async function LoginPage() { const session = await getCurrentSession(); if (session) redirect(getUserRole(session.user) === USER_ROLES.ADMIN ? "/admin" : "/dashboard"); return <AuthPageShell title="Sign in" description="Access your EasyGrantPath account."><LoginForm /></AuthPageShell>; }
