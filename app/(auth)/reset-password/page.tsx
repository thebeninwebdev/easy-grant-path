import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
export const metadata: Metadata = { title: "Reset Password" };
export default function ResetPasswordPage() { return <AuthPageShell title="Reset password" description="Choose a new password for your account."><Suspense fallback={<p className="text-sm text-muted-foreground">Loading reset form...</p>}><ResetPasswordForm /></Suspense></AuthPageShell>; }
