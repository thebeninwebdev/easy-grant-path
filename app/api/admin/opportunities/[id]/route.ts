import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { isValidObjectId } from "mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { Opportunity } from "@/models/Opportunity";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/opportunities/[id]">) {
  try { const session = await requireAdmin();
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new AppError("Invalid opportunity ID.", "VALIDATION_ERROR", 400);

    const body: unknown = await request.json();
    const action = typeof body === "object" && body !== null && "action" in body
      ? (body as { action?: unknown }).action
      : undefined;
    if (action !== "verify" && action !== "reject" && action !== "archive") {
      throw new AppError("Invalid opportunity action.", "VALIDATION_ERROR", 400);
    }

    await connectToDatabase();
    const update = action === "verify"
      ? { verificationStatus: "verified", verifiedAt: new Date(), status: "open" }
      : action === "reject"
        ? { verificationStatus: "rejected" }
        : { status: "archived" };
    const opportunity = await Opportunity.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" }).lean();
    if (!opportunity) throw new AppError("Opportunity not found.", "NOT_FOUND", 404);
    await recordAdminAudit({ actor: session.user, action: `opportunity.${action}`, resourceType: "opportunity", resourceId: id, summary: `Opportunity ${action} action completed` });
    return successResponse(opportunity);
  } catch (error) {
    return errorResponse(error);
  }
}
