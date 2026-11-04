import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/password-recovery-form';

export const metadata: Metadata = { title: 'Forgot password' };
export const instant = false;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const value = (await searchParams).email;
  const email = typeof value === 'string' ? value.slice(0, 254) : '';
  return <AuthShell title='Reset your password' description="Enter your email and we'll send secure reset instructions if an account exists."><ForgotPasswordForm initialEmail={email} /></AuthShell>;
}
