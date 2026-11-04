import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";
import { GrantSource } from "@/models/GrantSource";
import { Opportunity } from "@/models/Opportunity";
import { SourceSyncRun } from "@/models/SourceSyncRun";
import { getOpportunitySource } from "@/sources/shared/source-registry";
import { extractOpportunityFromUrl } from "@/services/opportunity-extraction";
import { opportunityFingerprint, slugify } from "./deduplicate";
import { getOpportunityStatus } from "./status";

export interface SyncResult {
  source: string;
  fetched: number;
  normalized: number;
  created: number;
  updated: number;
  skipped: number;
  irrelevant: number;
  failed: number;
  status: "success" | "partial";
  durationMs: number;
}

const IMAGE_REFRESH_MS = 30 * 86_400_000;

function approved(value: unknown) {
  return Boolean(value && typeof value === "object" && (value as { reviewStatus?: string }).reviewStatus === "approved");
}

export function imageRefreshDecision(existing: {
  opportunityImage?: unknown;
  organizationLogo?: unknown;
  metadata?: Record<string, unknown>;
} | null, now: Date) {
  if (!existing) return { fetch: true, replaceBanner: true, replaceLogo: true, reason: "new" };
  const missingBanner = !existing.opportunityImage;
  const missingLogo = !existing.organizationLogo;
  if (missingBanner || missingLogo) return { fetch: true, replaceBanner: missingBanner, replaceLogo: missingLogo, reason: "missing" };
  const checkedAt = existing.metadata?.imageCheckedAt ? new Date(String(existing.metadata.imageCheckedAt)) : null;
  const stale = Boolean(checkedAt && Number.isFinite(checkedAt.getTime()) && now.getTime() - checkedAt.getTime() >= IMAGE_REFRESH_MS);
  if (!stale) return { fetch: false, replaceBanner: false, replaceLogo: false, reason: "current" };
  const replaceBanner = !approved(existing.opportunityImage);
  const replaceLogo = !approved(existing.organizationLogo);
  return { fetch: replaceBanner || replaceLogo, replaceBanner, replaceLogo, reason: "stale" };
}

export async function syncSource(slug: string): Promise<SyncResult> {
  const source = getOpportunitySource(slug);
  if (!source) throw new Error("Unknown opportunity source: " + slug);
  await connectToDatabase();
  const grantSource = await GrantSource.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name: source.name, slug, type: source.type, trustLevel: "official", enabled: true, syncIntervalHours: 12 } },
    { returnDocument: "after", upsert: true },
  );
  if (!grantSource.enabled) throw new Error("Opportunity source " + slug + " is disabled");
  const startedAt = new Date();
  const run = await SourceSyncRun.create({ sourceSlug: slug, startedAt });
  const metrics = { fetched: 0, normalized: 0, created: 0, updated: 0, skipped: 0, irrelevant: 0, failed: 0 };

  try {
    logger.info("Opportunity sync started", { source: slug });
    const rawOpportunities = await source.fetch();
    metrics.fetched = rawOpportunities.length;
    for (const raw of rawOpportunities) {
      try {
        const opportunity = await source.normalize(raw);
        if (!opportunity) { metrics.skipped++; continue; }
        metrics.normalized++;
        const relevance = source.assessRelevance(opportunity);
        if (!relevance.relevant) { metrics.irrelevant++; continue; }

        const now = new Date();
        const existing = await Opportunity.findOne({
          "source.slug": slug,
          "source.externalId": opportunity.externalId,
        }).select("_id opportunityImage organizationLogo metadata").lean();
        const refresh = imageRefreshDecision(existing as {
          opportunityImage?: unknown;
          organizationLogo?: unknown;
          metadata?: Record<string, unknown>;
        } | null, now);
        const extracted = refresh.fetch
          ? await extractOpportunityFromUrl(opportunity.officialUrl, opportunity.title).catch(() => null)
          : null;
        const sourceFields = {
          title: opportunity.title,
          slug: slugify(opportunity.title),
          summary: opportunity.summary,
          description: opportunity.description,
          organization: opportunity.organization,
          agency: opportunity.agency,
          type: opportunity.type ?? "grant",
          countries: opportunity.countries ?? [],
          eligibleCountries: opportunity.eligibleCountries ?? [],
          applicantTypes: opportunity.applicantTypes ?? [],
          sectors: opportunity.sectors ?? [],
          fundingMin: opportunity.fundingMin,
          fundingMax: opportunity.fundingMax,
          currency: opportunity.currency ?? "USD",
          openingDate: opportunity.openingDate,
          deadline: opportunity.deadline,
          officialUrl: opportunity.officialUrl,
          discoveryUrl: opportunity.discoveryUrl,
          opportunityNumber: opportunity.opportunityNumber,
          sourceLastUpdatedAt: opportunity.sourceLastUpdatedAt,
          lastCheckedAt: now,
          fingerprint: opportunityFingerprint(opportunity),
          relevanceScore: relevance.score,
          relevanceReasons: relevance.reasons,
          status: getOpportunityStatus(opportunity.openingDate, opportunity.deadline, now),
          metadata: {
            ...(opportunity.metadata ?? {}),
            ...((existing?.metadata as Record<string, unknown> | undefined) ?? {}),
            ...(extracted?.meta.images ? { imageResearch: extracted.meta.images, imageCheckedAt: now } : {}),
          },
        };
        if (existing) {
          await Opportunity.updateOne({ _id: existing._id }, {
            $set: {
              ...sourceFields,
              ...(refresh.replaceBanner && extracted?.data.opportunityImage ? { opportunityImage: extracted.data.opportunityImage } : {}),
              ...(refresh.replaceLogo && extracted?.data.organizationLogo ? { organizationLogo: extracted.data.organizationLogo } : {}),
            },
          });
          metrics.updated++;
          logger.debug("Opportunity sync images handled", {
            source: slug,
            refreshReason: refresh.reason,
            imagesFetched: Boolean(extracted?.meta.images),
            approvedBannerPreserved: approved(existing.opportunityImage),
            approvedLogoPreserved: approved(existing.organizationLogo),
          });
        } else {
          await Opportunity.create({
            ...sourceFields,
            ...(extracted?.data.opportunityImage ? { opportunityImage: extracted.data.opportunityImage } : {}),
            ...(extracted?.data.organizationLogo ? { organizationLogo: extracted.data.organizationLogo } : {}),
            source: { slug, name: source.name, type: source.type, externalId: opportunity.externalId },
            verificationStatus: "needs_review",
          });
          metrics.created++;
        }
      } catch (error) {
        metrics.failed++;
        logger.warn("Opportunity sync item failed", { source: slug, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    const status = metrics.failed ? "partial" as const : "success" as const;
    const durationMs = Date.now() - startedAt.getTime();
    await SourceSyncRun.updateOne({ _id: run._id }, { $set: { ...metrics, status, completedAt: new Date(), durationMs } });
    await GrantSource.updateOne({ _id: grantSource._id }, { $set: { lastSyncAt: new Date(), lastSuccessfulSyncAt: new Date(), lastError: undefined, failureCount: 0 } });
    logger.info("Opportunity sync completed", { source: slug, ...metrics, durationMs });
    return { source: slug, ...metrics, status, durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const durationMs = Date.now() - startedAt.getTime();
    await SourceSyncRun.updateOne({ _id: run._id }, { $set: { ...metrics, status: "failed", completedAt: new Date(), durationMs, errorSummary: message } });
    await GrantSource.updateOne({ _id: grantSource._id }, { $set: { lastSyncAt: new Date(), lastFailedSyncAt: new Date(), lastError: message }, $inc: { failureCount: 1 } });
    logger.error("Opportunity sync failed", { source: slug, error: message });
    throw error;
  }
}
