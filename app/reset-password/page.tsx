import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/password-recovery-form';

export const metadata: Metadata = { title: 'Reset password' };
export const instant = false;

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : undefined;
  const invalid = params.error === 'INVALID_TOKEN';
  return <AuthShell title='Choose a new password' description='Create a secure password for your EasyGrantPath account.'><ResetPasswordForm token={token} invalid={invalid} /></AuthShell>;
}
