import Link from "next/link";
import { Leaf } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentSession, getUserRole } from "@/lib/auth-session";
import { USER_ROLES } from "@/types/roles";
export const metadata: Metadata = { title: "Create Account" };
export default async function RegisterPage() { const session = await getCurrentSession(); if (session) redirect(getUserRole(session.user) === USER_ROLES.ADMIN ? "/admin" : "/dashboard"); return <main className="flex min-h-screen items-center bg-[#f5f8f5] px-4 py-6 sm:px-6 lg:px-8"><section className="mx-auto w-full max-w-6xl rounded-2xl border border-[#e1ebe3] bg-white p-5 shadow-[0_18px_50px_rgba(22,65,43,0.08)] sm:p-8 lg:p-10"><header className="flex items-center justify-between gap-4"><Link aria-label="EasyGrantPath home" className="inline-flex items-center gap-2 font-semibold tracking-tight text-[#102b20]" href="/"><span className="grid size-7 place-items-center rounded-md bg-[#087443] text-white"><Leaf aria-hidden="true" className="size-4" /></span>EasyGrant<span className="text-[#087443]">Path</span></Link><p className="text-right text-xs text-muted-foreground sm:text-sm">Already have an account? <Link className="font-semibold text-[#087443] hover:underline" href="/login">Sign in</Link></p></header><div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-12"><div className="mx-auto w-full max-w-md lg:mx-0 lg:pl-8"><h1 className="text-3xl font-semibold tracking-tight text-[#102b20]">Create your account</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Join EasyGrantPath to discover funding opportunities and access expert support.</p><div className="mt-7"><RegisterForm /></div></div><AuthBrandPanel /></div></section></main>; }
