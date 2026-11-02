"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter(); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const signUp = mode === "sign-up";
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); setLoading(true); try {
    const result = signUp ? await authClient.signUp.email({ name, email, password, callbackURL: "/dashboard/onboarding" }) : await authClient.signIn.email({ email, password, callbackURL: "/dashboard/onboarding" });
    if (result.error) throw new Error(result.error.message || "Authentication failed.");
    router.push("/dashboard/onboarding"); router.refresh();
  } catch (caught) { setError(caught instanceof Error ? caught.message : "Authentication failed."); } finally { setLoading(false); } }
  return <form onSubmit={submit} className="mt-8 space-y-5">{signUp ? <label className="block text-sm font-medium">Name<Input required className="mt-2 h-11" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label> : null}<label className="block text-sm font-medium">Email address<Input required type="email" className="mt-2 h-11" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label className="block text-sm font-medium">Password<Input required type="password" minLength={8} className="mt-2 h-11" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={signUp ? "new-password" : "current-password"} /><span className="mt-1 block text-xs font-normal text-muted-foreground">{signUp ? "Use at least 8 characters." : null}</span></label>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<Button className="h-11 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{loading ? "Please wait..." : signUp ? "Create account" : "Sign in"}</Button><p className="text-center text-sm text-muted-foreground">{signUp ? "Already have an account? " : "New to EasyGrantPath? "}<Link className="font-medium text-primary hover:underline" href={signUp ? "/sign-in" : "/sign-up"}>{signUp ? "Sign in" : "Create an account"}</Link></p></form>;
}
