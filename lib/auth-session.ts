import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/types/roles";
export async function getCurrentSession() { return auth.api.getSession({ headers: await headers() }); }
export async function getCurrentUser() { return (await getCurrentSession())?.user ?? null; }
export type AuthSession = Awaited<ReturnType<typeof getCurrentSession>>;
export function getUserRole(user: { role?: unknown } | null): UserRole { return user?.role === USER_ROLES.ADMIN ? USER_ROLES.ADMIN : USER_ROLES.USER; }
export async function requireAuth(callbackUrl?: string) { const session = await getCurrentSession(); if (!session) redirect(`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`); return session; }
export async function requireAdmin() { const session = await requireAuth("/admin"); if (getUserRole(session.user) !== USER_ROLES.ADMIN) redirect("/dashboard"); return session; }
