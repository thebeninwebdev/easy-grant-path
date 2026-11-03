import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response"; import { syncSource } from "@/services/opportunity-ingestion/sync-source";
export async function POST() { try { await requireAdmin(); return successResponse(await syncSource("grants-gov")); } catch (error) { return errorResponse(error); } }
