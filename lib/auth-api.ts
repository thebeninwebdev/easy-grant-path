import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/auth-session";
import { USER_ROLES } from "@/types/roles";
export async function getApiSession() { return auth.api.getSession({ headers: await headers() }); }
export async function requireApiAuth() { const session = await getApiSession(); return session ? { session } : { response: Response.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, { status: 401 }) }; }
export async function requireApiAdmin() { const authResult = await requireApiAuth(); if ("response" in authResult) return authResult; return getUserRole(authResult.session.user) === USER_ROLES.ADMIN ? authResult : { response: Response.json({ error: { code: "FORBIDDEN", message: "Administrator access required." } }, { status: 403 }) }; }
