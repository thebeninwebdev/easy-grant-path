"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/i18n/navigation";
import { localizedPath } from "@/i18n/paths";
import type { SupportedLocale } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";

type Fields = Partial<Record<"name" | "email" | "password", string>>;

export function AuthForm({ mode, callbackURL = "/dashboard/onboarding" }: { mode: "sign-in" | "sign-up"; callbackURL?: string }) {
  const router = useRouter();
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Auth");
  const signUp = mode === "sign-up";
  const verificationCallbackURL = localizedPath("/dashboard/onboarding", locale);
  const localizedCallbackURL = localizedPath(callbackURL, locale);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
    if (signUp && name.trim().length < 2) next.name = t("errors.nameRequired");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t("errors.emailRequired");
    if (!password) next.password = t("errors.passwordRequired");
    else if (signUp && password.length < 8) next.password = t("errors.passwordTooShort");
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function authError(code?: string, message?: string) {
    if (code === "EMAIL_NOT_VERIFIED") return t("errors.emailNotVerified");
    if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_PASSWORD") return t("errors.invalidEmailOrPassword");
    if (code?.includes("USER_ALREADY_EXISTS") || code?.includes("EMAIL_ALREADY") || message?.toLowerCase().includes("already")) return t("errors.userAlreadyExists");
    if (code === "TOO_MANY_REQUESTS") return t("errors.tooManyRequests");
    return signUp ? t("errors.signUpFailed") : t("errors.signInFailed");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !validate()) return;
    setError(""); setMessage(""); setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (signUp) {
        const result = await authClient.signUp.email({ name: name.trim(), email: normalizedEmail, password, callbackURL: verificationCallbackURL });
        if (result.error) throw Object.assign(new Error(result.error.message || ""), { code: result.error.code });
        setVerificationEmail(normalizedEmail); setCooldown(30); return;
      }
      const result = await authClient.signIn.email({ email: normalizedEmail, password, callbackURL: localizedCallbackURL });
      if (result.error?.code === "EMAIL_NOT_VERIFIED") { setVerificationEmail(normalizedEmail); return; }
      if (result.error) throw Object.assign(new Error(result.error.message || ""), { code: result.error.code });
      router.replace(("/auth/continue?callbackURL=" + encodeURIComponent(localizedCallbackURL)) as never);
      router.refresh();
    } catch (caught) {
      const issue = caught as Error & { code?: string };
      setError(authError(issue.code, issue.message));
    } finally { setLoading(false); }
  }

  async function resendVerification() {
    if (resending || cooldown) return;
    setError(""); setMessage(""); setResending(true);
    try {
      const result = await authClient.sendVerificationEmail({ email: verificationEmail, callbackURL: verificationCallbackURL });
      if (result.error) throw new Error(result.error.message || "");
      setMessage(t("signUp.resendSuccess")); setCooldown(30);
    } catch { setError(t("errors.resendFailed")); }
    finally { setResending(false); }
  }

  if (verificationEmail) return <div className="mt-9 text-center">
    <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><MailCheck className="size-7" aria-hidden="true" /></span>
    <h2 className="mt-5 text-2xl font-semibold tracking-tight">{t("signUp.verificationSent")}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("signUp.verificationBody", { email: verificationEmail })}</p>
    {message ? <p role="status" aria-live="polite" className="mt-4 text-sm text-primary">{message}</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
    <div className="mt-6 space-y-3">
      <Button type="button" variant="outline" className="h-12 w-full" disabled={resending || cooldown > 0} onClick={() => void resendVerification()}>{resending ? <LoaderCircle className="size-4 animate-spin" /> : null}{resending ? t("signUp.resending") : cooldown ? t("signUp.waitSeconds", { seconds: cooldown }) : t("signUp.resend")}</Button>
      <Button type="button" variant="ghost" className="h-11 w-full" onClick={() => { setVerificationEmail(""); setMessage(""); setError(""); }}>{t("signUp.useDifferentEmail")}</Button>
      <Link href="/sign-in" className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" /> {t("forgotPassword.backToSignIn")}</Link>
    </div>
  </div>;

  return <form onSubmit={submit} noValidate className="mt-9 space-y-5">
    {signUp ? <div><label htmlFor="full-name" className="text-sm font-medium">{t("fields.name")}</label><Input id="full-name" name="name" required autoComplete="name" placeholder={t("fields.namePlaceholder")} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "full-name-error" : undefined} className="mt-2 h-12" value={name} disabled={loading} onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, name: undefined })); setError(""); }} />{fieldErrors.name ? <p id="full-name-error" role="alert" className="mt-1.5 text-xs text-destructive">{fieldErrors.name}</p> : null}</div> : null}
    <div><label htmlFor="email" className="text-sm font-medium">{t("fields.email")}</label><Input id="email" name="email" required type="email" inputMode="email" autoComplete="username" placeholder={t("fields.emailPlaceholder")} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined} className="mt-2 h-12" value={email} disabled={loading} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); setError(""); }} />{fieldErrors.email ? <p id="email-error" role="alert" className="mt-1.5 text-xs text-destructive">{fieldErrors.email}</p> : null}</div>
    <div className="relative">
      {!signUp ? <Link href="/forgot-password" className="absolute right-0 top-0 z-10 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("signIn.forgotPassword")}</Link> : null}
      <PasswordInput id="password" name="password" label={t("fields.password")} required autoComplete={signUp ? "new-password" : "current-password"} placeholder={t("fields.passwordPlaceholder")} value={password} disabled={loading} error={fieldErrors.password} guidance={signUp ? t("errors.passwordGuidance") : undefined} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); setError(""); }} />
    </div>
    {error ? <p role="alert" aria-live="polite" className="text-sm text-destructive">{error}</p> : null}
    <Button className="h-12 w-full text-[15px]" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{loading ? t(signUp ? "signUp.submitting" : "signIn.submitting") : t(signUp ? "signUp.submit" : "signIn.submit")}</Button>
    <p className="text-center text-sm text-muted-foreground">{t(signUp ? "signUp.hasAccount" : "signIn.noAccount")}{" "}<Link className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={signUp ? "/sign-in" : "/sign-up"}>{t(signUp ? "signUp.signIn" : "signIn.createAccount")}</Link></p>
  </form>;
}
