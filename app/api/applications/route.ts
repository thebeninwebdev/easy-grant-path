import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { listProposalApplications, startProposal } from "@/lib/proposals";
import { startProposalSchema } from "@/lib/validation/proposal";
export async function GET() { try { return successResponse(await listProposalApplications()); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const parsed = startProposalSchema.safeParse(await request.json()); if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid request.", "VALIDATION_ERROR", 400); return successResponse(await startProposal(parsed.data), { status: 201 }); } catch (error) { return errorResponse(error); } }
