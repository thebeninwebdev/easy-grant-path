import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { completeProposal, getProposalApplication, updateProposalMetadata, updateProposalSection } from "@/lib/proposals";
import { completeProposalSchema, updateProposalMetadataSchema, updateProposalSchema } from "@/lib/validation/proposal";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const item = await getProposalApplication((await context.params).id); if (!item) throw new AppError("Proposal not found.", "NOT_FOUND", 404); return successResponse(item); } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const body: unknown = await request.json(); const complete = completeProposalSchema.safeParse(body); const id = (await context.params).id; if (complete.success) return successResponse(await completeProposal(id)); const metadata = updateProposalMetadataSchema.safeParse(body); if (metadata.success) return successResponse(await updateProposalMetadata(id, metadata.data.metadata)); const update = updateProposalSchema.safeParse(body); if (!update.success) throw new AppError(update.error.issues[0]?.message || "Invalid proposal update.", "VALIDATION_ERROR", 400); return successResponse(await updateProposalSection(id, update.data.sectionKey, update.data.content)); } catch (error) { return errorResponse(error); }
}
