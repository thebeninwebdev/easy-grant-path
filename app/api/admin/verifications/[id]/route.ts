import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { getAdminVerification, reviewAdminVerification } from "@/lib/admin-verifications";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const item = await getAdminVerification((await context.params).id); if (!item) throw new AppError("Verification not found.", "NOT_FOUND", 404); return successResponse(item); }
  catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin(); const { id } = await context.params;
    const parsed = z.object({ status: z.enum(["verified", "action_required", "rejected"]), reason: z.string().trim().max(1000).optional() }).safeParse(await request.json());
    if (!parsed.success || (["action_required", "rejected"].includes(parsed.data.status) && !parsed.data.reason)) throw new AppError("A reason is required for rejection or resubmission.", "VALIDATION_ERROR", 400);
    const result = await reviewAdminVerification(id, parsed.data.status, session.user.id, parsed.data.reason);
    await recordAdminAudit({ actor: session.user, action: `verification.${parsed.data.status}`, resourceType: "verification", resourceId: id, summary: `Verification set to ${parsed.data.status}`, reason: parsed.data.reason });
    return successResponse(result);
  } catch (error) { return errorResponse(error); }
}
