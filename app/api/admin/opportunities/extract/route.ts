import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { extractionRequestSchema } from "@/lib/validation/opportunity";
import { extractOpportunityFromUrl } from "@/services/opportunity-extraction";

export async function POST(request: Request) {
  let hostname = "unknown";
  try {
    const body: unknown = await request.json();
    const result = extractionRequestSchema.safeParse(body);
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Enter a valid public URL.", "VALIDATION_ERROR", 400);
    hostname = new URL(result.data.url).hostname;
    return Response.json(await extractOpportunityFromUrl(result.data.url));
  } catch (error) {
    const safeError = error instanceof SyntaxError ? new AppError("Request body must be valid JSON.", "VALIDATION_ERROR", 400) : error;
    logger.warn("Opportunity URL extraction failed", { hostname, error: safeError instanceof Error ? safeError.message : "Unknown extraction error" });
    return errorResponse(safeError);
  }
}
