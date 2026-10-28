"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "./form-message";
export function ForgotPasswordForm() { const [pending, setPending] = useState(false); const [message, setMessage] = useState<string>(); const [error, setError] = useState<string>(); async function submit(formData: FormData) { const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) { setError(parsed.error.issues[0]?.message); return; } setPending(true); setError(undefined); await authClient.requestPasswordReset({ email: parsed.data.email, redirectTo: `${window.location.origin}/reset-password` }); setPending(false); setMessage("If an account exists for this email, a password reset link has been sent."); } return <form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" autoComplete="email" /></div><FormMessage message={error} />{message && <p className="text-sm text-green-700">{message}</p>}<Button className="w-full" disabled={pending}>{pending ? "Sending reset link..." : "Send reset link"}</Button><p className="text-center text-sm"><Link className="underline" href="/login">Back to sign in</Link></p></form>; }
