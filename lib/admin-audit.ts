import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
export async function recordAdminAudit(input: { actor: { id: string; email?: string | null; role?: string | null }; action: string; resourceType: string; resourceId: string; summary: string; reason?: string }) {
  await connectToDatabase();
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return AuditLog.create({
    actorId: input.actor.id, actorEmail: input.actor.email, actorRole: input.actor.role, action: input.action,
    resourceType: input.resourceType, resourceId: input.resourceId, summary: input.summary, reason: input.reason,
    requestMetadata: { ipHash: forwarded ? createHash("sha256").update(forwarded).digest("hex") : undefined, userAgent: requestHeaders.get("user-agent")?.slice(0, 300) },
  });
}
