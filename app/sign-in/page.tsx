import type { Metadata } from 'next';
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from '@/components/auth/auth-shell';
import { safeAuthCallback } from '@/lib/auth-redirect';

export const instant = false;
export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackURL?: string | string[] }> }) {
  const callbackURL = safeAuthCallback((await searchParams).callbackURL);
  return <AuthShell title='Welcome back' description='Sign in to continue your funding journey.'><AuthForm mode='sign-in' callbackURL={callbackURL} /></AuthShell>;
}
