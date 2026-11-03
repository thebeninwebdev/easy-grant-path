"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const verificationCallbackURL = "/dashboard/onboarding";

export function AuthForm({ mode, callbackURL = verificationCallbackURL }: { mode: "sign-in" | "sign-up"; callbackURL?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (signUp) {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: normalizedEmail,
          password,
          callbackURL: verificationCallbackURL,
        });
        if (result.error) throw new Error(result.error.message || "Could not create your account.");
        setVerificationEmail(normalizedEmail);
        return;
      }

      const result = await authClient.signIn.email({ email: normalizedEmail, password, callbackURL });
      if (result.error?.code === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(normalizedEmail);
        return;
      }
      if (result.error) throw new Error(result.error.message || "Authentication failed.");
      router.push(callbackURL);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setError("");
    setMessage("");
    setResending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: verificationEmail,
        callbackURL: verificationCallbackURL,
      });
      if (result.error) throw new Error(result.error.message || "Could not resend the verification email.");
      setMessage("A new verification email has been sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not resend the verification email.");
    } finally {
      setResending(false);
    }
  }

  if (verificationEmail) {
    return (
      <div className="mt-8 space-y-5 text-center">
        <MailCheck className="mx-auto size-12 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link to <strong className="text-foreground">{verificationEmail}</strong>. You cannot continue until you verify your email address.
          </p>
        </div>
        {message ? <p role="status" className="text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" variant="outline" className="w-full" disabled={resending} onClick={() => void resendVerification()}>
          {resending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {resending ? "Sending..." : "Resend verification email"}
        </Button>
        <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => setVerificationEmail("")}>
          Use a different email address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {signUp ? <label className="block text-sm font-medium">Name<Input required className="mt-2 h-11" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label> : null}
      <label className="block text-sm font-medium">Email address<Input required type="email" className="mt-2 h-11" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      <label className="block text-sm font-medium">Password<Input required type="password" minLength={8} className="mt-2 h-11" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={signUp ? "new-password" : "current-password"} /><span className="mt-1 block text-xs font-normal text-muted-foreground">{signUp ? "Use at least 8 characters." : null}</span></label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button className="h-11 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{loading ? "Please wait..." : signUp ? "Create account" : "Sign in"}</Button>
      <p className="text-center text-sm text-muted-foreground">{signUp ? "Already have an account? " : "New to EasyGrantPath? "}<Link className="font-medium text-primary hover:underline" href={signUp ? "/sign-in" : "/sign-up"}>{signUp ? "Sign in" : "Create an account"}</Link></p>
    </form>
  );
}