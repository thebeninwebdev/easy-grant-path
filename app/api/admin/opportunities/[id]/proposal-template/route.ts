import { requireAdmin } from "@/lib/admin-auth";
import { isValidObjectId } from "mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { proposalTemplateInputSchema } from "@/lib/validation/proposal";
import { Opportunity } from "@/models/Opportunity";
import { ProposalTemplate } from "@/models/ProposalTemplate";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireAdmin();
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new AppError("Invalid opportunity ID.", "VALIDATION_ERROR", 400);
    const parsed = proposalTemplateInputSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid Proposal Starter.", "VALIDATION_ERROR", 400);
    await connectToDatabase();
    if (!await Opportunity.exists({ _id: id })) throw new AppError("Opportunity not found.", "NOT_FOUND", 404);
    const template = await ProposalTemplate.findOneAndUpdate(
      { opportunityId: id },
      { $set: { ...parsed.data, sections: parsed.data.sections.slice().sort((a, b) => a.order - b.order), updatedBy: "development-admin" }, $setOnInsert: { createdBy: "development-admin" } },
      { returnDocument: "after", upsert: true, runValidators: true },
    ).lean();
    return successResponse(template);
  } catch (error) { return errorResponse(error); }
}
