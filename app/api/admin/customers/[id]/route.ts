import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { recordAdminAudit } from "@/lib/admin-audit";
import { UserProfile } from "@/models/UserProfile";
const schema = z.union([
  z.object({ accountStatus: z.enum(["active", "suspended"]), reason: z.string().trim().min(3).max(500) }),
  z.object({ adminNotes: z.string().max(5000) }),
]);
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin(); const { id } = await context.params;
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) throw new AppError("Invalid customer update.", "VALIDATION_ERROR", 400);
    await connectToDatabase();
    const update = "accountStatus" in parsed.data ? { accountStatus: parsed.data.accountStatus, suspendedAt: parsed.data.accountStatus === "suspended" ? new Date() : null, suspendedBy: parsed.data.accountStatus === "suspended" ? session.user.id : null } : { adminNotes: parsed.data.adminNotes };
    const profile = await UserProfile.findOneAndUpdate({ userId: id }, { $set: update }, { returnDocument: "after" }).lean();
    if (!profile) throw new AppError("Customer not found.", "NOT_FOUND", 404);
    await recordAdminAudit({ actor: session.user, action: "accountStatus" in parsed.data ? `customer.${parsed.data.accountStatus}` : "customer.notes_updated", resourceType: "customer", resourceId: id, summary: "accountStatus" in parsed.data ? `Customer account set to ${parsed.data.accountStatus}` : "Customer internal notes updated", reason: "reason" in parsed.data ? parsed.data.reason : undefined });
    return successResponse(profile);
  } catch (error) { return errorResponse(error); }
}
