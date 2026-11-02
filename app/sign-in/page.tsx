import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
export default function SignInPage() { return <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-10"><section className="w-full rounded-3xl border bg-card p-7 shadow-sm sm:p-10"><Link href="/"><Image src="/logo.png" alt="EasyGrantPath" width={160} height={54} className="h-auto w-36" priority /></Link><h1 className="mt-9 text-3xl font-semibold tracking-tight">Welcome back.</h1><p className="mt-3 text-muted-foreground">Sign in to continue your EasyGrantPath registration or return to your dashboard.</p><AuthForm mode="sign-in" /></section></main>; }
