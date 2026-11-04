import type { Metadata } from 'next';
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from '@/components/auth/auth-shell';
export const metadata: Metadata = { title: 'Create account' };
export default function SignUpPage() { return <AuthShell title='Create your account' description='Join EasyGrantPath and discover funding opportunities tailored to your goals.'><AuthForm mode='sign-up' /></AuthShell>; }
