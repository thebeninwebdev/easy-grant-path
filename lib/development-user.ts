import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();
  if (!userId) throw new AppError("Sign in required.", "UNAUTHORIZED", 401);
  return userId;
}
