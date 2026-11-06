import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { getOpportunitySource } from "@/sources/shared/source-registry";
import { syncSource } from "@/services/opportunity-ingestion/sync-source";
export async function POST(request: Request) { try { await requireAdmin(); const body = await request.json().catch(() => ({})) as { source?: unknown }; const source = typeof body.source === "string" ? body.source : "grants-gov"; if (!getOpportunitySource(source)) throw new AppError("Unsupported opportunity source.", "VALIDATION_ERROR", 400); return successResponse(await syncSource(source)); } catch (error) { return errorResponse(error); } }