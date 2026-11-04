'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle, MailCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/auth/password-input';

export function ForgotPasswordForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) return setError('Enter a valid email address.');
    setError(''); setLoading(true);
    try {
      const result = await authClient.requestPasswordReset({ email: normalized, redirectTo: '/reset-password' });
      if (result.error) throw new Error(result.error.message || 'Request failed.');
      setSubmitted(true);
    } catch { setError('We could not process your request. Wait a moment and try again.'); }
    finally { setLoading(false); }
  }

  if (submitted) return <div className='mt-9 text-center'><span className='mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary'><MailCheck className='size-7' /></span><h2 className='mt-5 text-xl font-semibold'>Check your email</h2><p className='mt-2 text-sm leading-6 text-muted-foreground'>If an account exists for that address, we&apos;ve sent password reset instructions.</p><Link href='/sign-in' className='mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline'><ArrowLeft className='size-4' /> Back to sign in</Link></div>;

  return <form onSubmit={submit} noValidate className='mt-9 space-y-5'><div><label htmlFor='recovery-email' className='text-sm font-medium'>Email address</label><Input id='recovery-email' name='email' type='email' inputMode='email' autoComplete='username' required className='mt-2 h-12' placeholder='you@example.com' value={email} aria-invalid={Boolean(error)} aria-describedby={error ? 'recovery-error' : undefined} disabled={loading} onChange={(event) => { setEmail(event.target.value); setError(''); }} />{error ? <p id='recovery-error' role='alert' className='mt-1.5 text-xs text-destructive'>{error}</p> : null}</div><Button className='h-12 w-full' disabled={loading}>{loading ? <LoaderCircle className='size-4 animate-spin' /> : null}{loading ? 'Sending instructions...' : 'Send reset instructions'}</Button><Link href='/sign-in' className='flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary hover:underline'><ArrowLeft className='size-4' /> Back to sign in</Link></form>;
}

export function ResetPasswordForm({ token, invalid }: { token?: string; invalid?: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(invalid ? 'This password reset link is invalid or has expired.' : '');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !token) return;
    if (password.length < 8) return setError('Password must contain at least 8 characters.');
    setError(''); setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message || 'Reset failed.');
      setComplete(true);
    } catch { setError('This password reset link is invalid or has expired. Request a new link.'); }
    finally { setLoading(false); }
  }

  if (complete) return <div className='mt-9 text-center'><span className='mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary'><CheckCircle2 className='size-7' /></span><h2 className='mt-5 text-xl font-semibold'>Password updated</h2><p className='mt-2 text-sm text-muted-foreground'>Your new password is ready to use.</p><Button asChild className='mt-6 h-12 w-full'><Link href='/sign-in'>Continue to sign in</Link></Button></div>;
  if (!token || invalid) return <div className='mt-9'><p role='alert' className='text-sm text-destructive'>{error}</p><Button asChild className='mt-6 h-12 w-full'><Link href='/forgot-password'>Request a new reset link</Link></Button><Link href='/sign-in' className='mt-3 flex min-h-11 items-center justify-center text-sm font-medium text-primary hover:underline'>Back to sign in</Link></div>;
  return <form onSubmit={submit} className='mt-9 space-y-5'><PasswordInput id='new-password' name='new-password' label='New password' autoComplete='new-password' required value={password} disabled={loading} error={error} guidance='Use at least 8 characters.' onChange={(event) => { setPassword(event.target.value); setError(''); }} /><Button className='h-12 w-full' disabled={loading}>{loading ? <LoaderCircle className='size-4 animate-spin' /> : null}{loading ? 'Updating password...' : 'Reset password'}</Button></form>;
}
