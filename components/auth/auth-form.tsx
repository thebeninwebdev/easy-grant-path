'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, MailCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/auth/password-input';

const verificationCallbackURL = '/dashboard/onboarding';
type Fields = Partial<Record<'name' | 'email' | 'password', string>>;

function friendlyAuthError(code?: string, message?: string, signUp?: boolean) {
  if (code === 'EMAIL_NOT_VERIFIED') return 'Verify your email address to continue.';
  if (code === 'INVALID_EMAIL_OR_PASSWORD' || code === 'INVALID_PASSWORD') return 'Incorrect email or password.';
  if (code?.includes('USER_ALREADY_EXISTS') || code?.includes('EMAIL_ALREADY')) return 'An account with this email already exists.';
  if (code === 'TOO_MANY_REQUESTS') return 'Too many attempts. Wait a moment and try again.';
  if (message?.toLowerCase().includes('already')) return 'An account with this email already exists.';
  return signUp ? 'We could not create your account. Please try again.' : 'We could not sign you in. Please try again.';
}

export function AuthForm({ mode, callbackURL = verificationCallbackURL }: { mode: 'sign-in' | 'sign-up'; callbackURL?: string }) {
  const router = useRouter();
  const signUp = mode === 'sign-up';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function validate() {
    const next: Fields = {};
    if (signUp && name.trim().length < 2) next.name = 'Enter your full name.';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    else if (signUp && password.length < 8) next.password = 'Password must contain at least 8 characters.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !validate()) return;
    setError(''); setMessage(''); setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (signUp) {
        const result = await authClient.signUp.email({ name: name.trim(), email: normalizedEmail, password, callbackURL: verificationCallbackURL });
        if (result.error) throw Object.assign(new Error(result.error.message || ''), { code: result.error.code });
        setVerificationEmail(normalizedEmail); setCooldown(30); return;
      }
      const result = await authClient.signIn.email({ email: normalizedEmail, password, callbackURL });
      if (result.error?.code === 'EMAIL_NOT_VERIFIED') { setVerificationEmail(normalizedEmail); return; }
      if (result.error) throw Object.assign(new Error(result.error.message || ''), { code: result.error.code });
      router.push(callbackURL); router.refresh();
    } catch (caught) {
      const issue = caught as Error & { code?: string };
      setError(friendlyAuthError(issue.code, issue.message, signUp));
    } finally { setLoading(false); }
  }

  async function resendVerification() {
    if (resending || cooldown) return;
    setError(''); setMessage(''); setResending(true);
    try {
      const result = await authClient.sendVerificationEmail({ email: verificationEmail, callbackURL: verificationCallbackURL });
      if (result.error) throw new Error(result.error.message || 'Could not resend the verification email.');
      setMessage('A new verification email has been sent.'); setCooldown(30);
    } catch { setError('We could not resend the verification email. Please try again.'); }
    finally { setResending(false); }
  }

  if (verificationEmail) return <div className='mt-9 text-center'>
    <span className='mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary'><MailCheck className='size-7' aria-hidden='true' /></span>
    <h2 className='mt-5 text-2xl font-semibold tracking-tight'>Check your email</h2>
    <p className='mt-2 text-sm leading-6 text-muted-foreground'>We&apos;ve sent a verification link to your email address.</p>
    <p className='mt-2 break-all text-sm font-medium'>{verificationEmail}</p>
    {message ? <p role='status' aria-live='polite' className='mt-4 text-sm text-primary'>{message}</p> : null}
    {error ? <p role='alert' className='mt-4 text-sm text-destructive'>{error}</p> : null}
    <div className='mt-6 space-y-3'>
      <Button type='button' variant='outline' className='h-12 w-full' disabled={resending || cooldown > 0} onClick={() => void resendVerification()}>{resending ? <LoaderCircle className='size-4 animate-spin' /> : null}{resending ? 'Sending...' : cooldown ? `Resend available in ${cooldown}s` : 'Resend verification email'}</Button>
      <Button type='button' variant='ghost' className='h-11 w-full' onClick={() => { setVerificationEmail(''); setMessage(''); setError(''); }}>Use a different email address</Button>
      <Link href='/sign-in' className='inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'><ArrowLeft className='size-4' /> Back to sign in</Link>
    </div>
  </div>;

  return <form onSubmit={submit} noValidate className='mt-9 space-y-5'>
    {signUp ? <div><label htmlFor='full-name' className='text-sm font-medium'>Full name</label><Input id='full-name' name='name' required autoComplete='name' placeholder='Your full name' aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'full-name-error' : undefined} className='mt-2 h-12' value={name} disabled={loading} onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, name: undefined })); setError(''); }} />{fieldErrors.name ? <p id='full-name-error' role='alert' className='mt-1.5 text-xs text-destructive'>{fieldErrors.name}</p> : null}</div> : null}
    <div><label htmlFor='email' className='text-sm font-medium'>Email address</label><Input id='email' name='email' required type='email' inputMode='email' autoComplete='username' placeholder='you@example.com' aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} className='mt-2 h-12' value={email} disabled={loading} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); setError(''); }} />{fieldErrors.email ? <p id='email-error' role='alert' className='mt-1.5 text-xs text-destructive'>{fieldErrors.email}</p> : null}</div>
    <div className='relative'>
      {!signUp ? <Link href='/forgot-password' className='absolute right-0 top-0 z-10 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>Forgot password?</Link> : null}
      <PasswordInput id='password' name='password' label='Password' required autoComplete={signUp ? 'new-password' : 'current-password'} placeholder={signUp ? 'Create a password' : 'Enter your password'} value={password} disabled={loading} error={fieldErrors.password} guidance={signUp ? 'Use at least 8 characters.' : undefined} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); setError(''); }} />
    </div>
    {error ? <p role='alert' aria-live='polite' className='text-sm text-destructive'>{error}</p> : null}
    <Button className='h-12 w-full text-[15px]' disabled={loading}>{loading ? <LoaderCircle className='size-4 animate-spin' /> : null}{loading ? signUp ? 'Creating account...' : 'Signing in...' : signUp ? 'Create account' : 'Sign in'}</Button>
    <p className='text-center text-sm text-muted-foreground'>{signUp ? 'Already have an account? ' : "Don't have an account? "}<Link className='font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' href={signUp ? '/sign-in' : '/sign-up'}>{signUp ? 'Sign in' : 'Create one'}</Link></p>
  </form>;
}
