"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validation/auth";
import { USER_ROLES } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "./form-message";
function safeCallback(value: string | null) { return value?.startsWith("/") && !value.startsWith("//") ? value : undefined; }
export function LoginForm() { const router = useRouter(); const searchParams = useSearchParams(); const [error, setError] = useState<string>(); const [pending, setPending] = useState(false); const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); async function submit(formData: FormData) { setError(undefined); const parsed = loginSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) { setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; } setFieldErrors({}); setPending(true); const { data, error: authError } = await authClient.signIn.email(parsed.data); setPending(false); if (authError || !data) { setError(authError?.status === 403 ? "Please verify your email before signing in." : "Invalid email or password."); return; } const user = data.user as { role?: string }; router.replace(safeCallback(searchParams.get("callbackUrl")) ?? (user.role === USER_ROLES.ADMIN ? "/admin" : "/dashboard")); } return <form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" autoComplete="email" /><FormMessage message={fieldErrors.email} /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" /><FormMessage message={fieldErrors.password} /></div><div className="text-right text-sm"><Link className="underline" href="/forgot-password">Forgot password?</Link></div><FormMessage message={error} /><Button className="w-full" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</Button><p className="text-center text-sm text-muted-foreground">New to EasyGrantPath? <Link className="underline" href="/register">Create an account</Link></p></form>; }
