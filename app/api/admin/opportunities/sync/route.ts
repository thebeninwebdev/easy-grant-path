import { errorResponse, successResponse } from "@/lib/api-response"; import { syncSource } from "@/services/opportunity-ingestion/sync-source";
export async function POST() { try { return successResponse(await syncSource("grants-gov")); } catch (error) { return errorResponse(error); } }
