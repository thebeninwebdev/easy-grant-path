"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import { localizedPath } from "@/i18n/paths";
import type { SupportedLocale } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";

export function ForgotPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale() as SupportedLocale;
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) return setError(t("errors.emailInvalid"));
    setError(""); setLoading(true);
    try {
      const result = await authClient.requestPasswordReset({ email: normalized, redirectTo: localizedPath("/reset-password", locale) });
      if (result.error) throw new Error(result.error.message || "");
      setSubmitted(true);
    } catch { setError(t("errors.resetFailed")); }
    finally { setLoading(false); }
  }

  if (submitted) return <div className="mt-9 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><MailCheck className="size-7" /></span><h2 className="mt-5 text-xl font-semibold">{t("forgotPassword.sentTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("forgotPassword.ifAccountExists", { email })}</p><Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" /> {t("forgotPassword.backToSignIn")}</Link></div>;

  return <form onSubmit={submit} noValidate className="mt-9 space-y-5"><div><label htmlFor="recovery-email" className="text-sm font-medium">{t("fields.email")}</label><Input id="recovery-email" name="email" type="email" inputMode="email" autoComplete="username" required className="mt-2 h-12" placeholder={t("fields.emailPlaceholder")} value={email} aria-invalid={Boolean(error)} aria-describedby={error ? "recovery-error" : undefined} disabled={loading} onChange={(event) => { setEmail(event.target.value); setError(""); }} />{error ? <p id="recovery-error" role="alert" className="mt-1.5 text-xs text-destructive">{error}</p> : null}</div><Button className="h-12 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{loading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}</Button><Link href="/sign-in" className="flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" /> {t("forgotPassword.backToSignIn")}</Link></form>;
}

export function ResetPasswordForm({ token, invalid }: { token?: string; invalid?: boolean }) {
  const t = useTranslations("Auth");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(invalid ? t("resetPassword.invalidToken") : "");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !token) return;
    if (password.length < 8) return setError(t("errors.passwordTooShort"));
    setError(""); setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message || "");
      setComplete(true);
    } catch { setError(t("resetPassword.invalidToken")); }
    finally { setLoading(false); }
  }

  if (complete) return <div className="mt-9 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="size-7" /></span><h2 className="mt-5 text-xl font-semibold">{t("resetPassword.successTitle")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("resetPassword.successBody")}</p><Button asChild className="mt-6 h-12 w-full"><Link href="/sign-in">{t("signIn.submit")}</Link></Button></div>;
  if (!token || invalid) return <div className="mt-9"><p role="alert" className="text-sm text-destructive">{error}</p><Button asChild className="mt-6 h-12 w-full"><Link href="/forgot-password">{t("resetPassword.requestNew")}</Link></Button><Link href="/sign-in" className="mt-3 flex min-h-11 items-center justify-center text-sm font-medium text-primary hover:underline">{t("forgotPassword.backToSignIn")}</Link></div>;
  return <form onSubmit={submit} className="mt-9 space-y-5"><PasswordInput id="new-password" name="new-password" label={t("fields.newPassword")} autoComplete="new-password" required value={password} disabled={loading} error={error} guidance={t("errors.passwordGuidance")} onChange={(event) => { setPassword(event.target.value); setError(""); }} /><Button className="h-12 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{loading ? t("resetPassword.submitting") : t("resetPassword.submit")}</Button></form>;
}
