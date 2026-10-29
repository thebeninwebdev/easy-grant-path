import { createHash, randomUUID } from "crypto";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { manualOpportunitySchema } from "@/lib/validation/opportunity";
import { Opportunity } from "@/models/Opportunity";
import { slugify } from "@/services/opportunity-ingestion/deduplicate";
import { getOpportunityStatus } from "@/services/opportunity-ingestion/status";

function dateAtNoonUtc(value?: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : undefined;
}

function canonicalUrl(value?: string) {
  if (!value) return undefined;
  const parsed = new URL(value);
  parsed.hash = "";
  if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
}

export async function POST(request: Request) {
  try {
    const result = manualOpportunitySchema.safeParse(await request.json());
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Invalid opportunity payload.", "VALIDATION_ERROR", 400);

    const input = result.data;
    const officialUrl = canonicalUrl(input.officialUrl);
    const discoveryUrl = canonicalUrl(input.discoveryUrl);
    const duplicateTerms: Record<string, unknown>[] = [];
    for (const url of new Set([officialUrl, discoveryUrl].filter((value): value is string => Boolean(value)))) {
      duplicateTerms.push({ officialUrl: url }, { discoveryUrl: url });
    }
    if (input.opportunityNumber) duplicateTerms.push({ opportunityNumber: input.opportunityNumber });

    await connectToDatabase();
    if (duplicateTerms.length) {
      const duplicate = await Opportunity.findOne({ $or: duplicateTerms }).select("_id title opportunityNumber").lean();
      if (duplicate) throw new AppError("This opportunity appears to already exist.", "DUPLICATE_OPPORTUNITY", 409, { existingId: String(duplicate._id), existingTitle: String(duplicate.title) });
    }

    const externalId = `manual-${randomUUID()}`;
    const openingDate = dateAtNoonUtc(input.openingDate);
    const deadline = dateAtNoonUtc(input.deadline);
    const verified = input.action === "verify";
    const { action: _action, ...fields } = input;
    const opportunity = await Opportunity.create({
      ...fields, officialUrl, discoveryUrl, openingDate, deadline,
      slug: slugify(input.title),
      source: { slug: "manual", name: "Manual entry", type: "manual", externalId },
      fingerprint: createHash("sha256").update(externalId).digest("hex"),
      status: verified ? "open" : getOpportunityStatus(openingDate, deadline),
      verificationStatus: verified ? "verified" : "needs_review",
      verifiedAt: verified ? new Date() : undefined,
      lastCheckedAt: new Date(), metadata: { manualEntry: true },
    });
    void _action;
    return successResponse(opportunity.toObject(), { status: 201 });
  } catch (error) {
    return errorResponse(error instanceof SyntaxError ? new AppError("Request body must be valid JSON.", "VALIDATION_ERROR", 400) : error);
  }
}
