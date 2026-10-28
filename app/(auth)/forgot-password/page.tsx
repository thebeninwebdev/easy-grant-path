import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentSession, getUserRole } from "@/lib/auth-session";
import { USER_ROLES } from "@/types/roles";
export const metadata: Metadata = { title: "Forgot Password" };
export default async function ForgotPasswordPage() { const session = await getCurrentSession(); if (session) redirect(getUserRole(session.user) === USER_ROLES.ADMIN ? "/admin" : "/dashboard"); return <AuthPageShell title="Forgot password" description="We will send a reset link if an account exists."><ForgotPasswordForm /></AuthPageShell>; }
