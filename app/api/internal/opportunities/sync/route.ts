import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { authorizeSyncRequest } from "@/lib/sync-auth";
import { getOpportunitySource } from "@/sources/shared/source-registry";
import { syncSource } from "@/services/opportunity-ingestion/sync-source";

export async function POST(request: Request) {
  const authorization = authorizeSyncRequest(request.headers.get("authorization"));
  if (!authorization.authorized) {
    const configurationError = authorization.reason.startsWith("sync_secret_");
    logger.warn("Opportunity sync authorization rejected", { reason: authorization.reason, tokenPresent: authorization.tokenPresent });
    return Response.json({ error: {
      code: configurationError ? "SYNC_NOT_CONFIGURED" : "UNAUTHORIZED",
      message: configurationError ? "SYNC_SECRET is missing or invalid on this server." : "Unauthorized.",
      ...(process.env.NODE_ENV !== "production" ? { diagnostic: { reason: authorization.reason, tokenPresent: authorization.tokenPresent } } : {}),
    } }, { status: configurationError ? 503 : 401 });
  }
  try {
    const body = await request.json().catch(() => ({})) as { source?: unknown };
    const source = typeof body.source === "string" ? body.source : "grants-gov";
    if (!getOpportunitySource(source)) throw new AppError("Unsupported opportunity source.", "VALIDATION_ERROR", 400);
    return successResponse(await syncSource(source));
  } catch (error) {
    return errorResponse(error);
  }
}