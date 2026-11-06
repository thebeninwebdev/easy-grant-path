import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { withAuthRecovery } from "@/lib/auth";
import { AppError } from "@/lib/errors";
export const getCurrentSession = cache(async () => { const requestHeaders=await headers(); return withAuthRecovery((auth)=>auth.api.getSession({headers:requestHeaders})); });
export async function getCurrentUserId() { const session=await getCurrentSession(); return session?.user.emailVerified?session.user.id:null; }
export async function requireCurrentUserId() { const session=await getCurrentSession(); if(!session)throw new AppError("Sign in required.","UNAUTHORIZED",401); if(!session.user.emailVerified)throw new AppError("Verify your email before continuing.","EMAIL_NOT_VERIFIED",403); return session.user.id; }
