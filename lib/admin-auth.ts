import "server-only";
import { AppError } from "@/lib/errors";
import { getCurrentSession } from "@/lib/development-user";
export function hasAdminRole(role: string | null | undefined) { return role?.split(",").map((value) => value.trim().toLowerCase()).includes("admin") ?? false; }
export async function requireAdmin() { const session = await getCurrentSession(); if (!session || !session.user.emailVerified) throw new AppError("Sign in required.", "UNAUTHORIZED", 401); if (!hasAdminRole(session.user.role)) throw new AppError("Administrator access required.", "FORBIDDEN", 403); return session; }
