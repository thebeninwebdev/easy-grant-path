import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";
export const metadata: Metadata = { title: "Verify Email" };
export default function VerifyEmailPage() { return <AuthPageShell title="Account created!" description="We’ve sent a verification link to your email address. Please check your inbox to continue."><Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}><VerifyEmailCard /></Suspense></AuthPageShell>; }
