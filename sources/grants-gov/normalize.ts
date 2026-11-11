import { normalizePlainText, sanitizeOpportunityHtml } from "@/lib/opportunity-content";
import { detectOpportunityType } from "@/sources/shared/relevance";
import type { NormalizedOpportunity, RawOpportunity } from "@/types/opportunities";

function getString(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function plain(value: unknown, maxLength?: number) {
  const normalized = normalizePlainText(value);
  return normalized && maxLength ? normalized.slice(0, maxLength).trim() : normalized ?? undefined;
}

function getDate(value: unknown) {
  if (!value || typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => {
    const candidate = typeof item === "string"
      ? item
      : typeof item === "object" && item
        ? getString(item as Record<string, unknown>, "name", "description", "code")
        : undefined;
    return plain(candidate);
  }).filter((item): item is string => Boolean(item)))];
}

export function normalizeGrantsGov(raw: RawOpportunity): NormalizedOpportunity | null {
  const root = raw.data;
  const opportunity = (root.opportunity ?? root) as Record<string, unknown>;
  const synopsis = (opportunity.synopsis ?? root.synopsis ?? {}) as Record<string, unknown>;
  const id = plain(getString(opportunity, "opportunityId", "id")) ?? raw.id;
  const title = plain(getString(opportunity, "opportunityTitle", "title"));
  if (!id || !title) return null;

  const rawDescription = getString(synopsis, "synopsisDesc", "description") ?? getString(opportunity, "description");
  const description = sanitizeOpportunityHtml(rawDescription) ?? undefined;
  const agency = plain(getString(opportunity, "agencyName", "agency") ?? getString(synopsis, "agencyName"));
  const summary = plain(getString(opportunity, "description", "synopsis"), 1_000);
  const applicantTypes = strings(synopsis.applicantTypes ?? opportunity.applicantTypes);
  const eligibleCountries = strings(
    synopsis.eligibleCountries
      ?? synopsis.countries
      ?? synopsis.geographicScope
      ?? opportunity.eligibleCountries
      ?? opportunity.countries
      ?? opportunity.geographicScope,
  );
  const type = detectOpportunityType([title, summary, description].filter(Boolean).join(" "));

  return {
    externalId: id,
    title,
    summary,
    description,
    organization: agency,
    agency,
    type: type ?? "grant",
    applicantTypes,
    eligibleCountries,
    countries: eligibleCountries,
    sectors: strings(synopsis.fundingCategories ?? opportunity.fundingCategories),
    fundingMin: Number(getString(synopsis, "awardFloor", "awardFloorAmt")) || undefined,
    fundingMax: Number(getString(synopsis, "awardCeiling", "awardCeilingAmt")) || undefined,
    currency: "USD",
    openingDate: getDate(getString(opportunity, "openDate", "postingDate")),
    deadline: getDate(getString(synopsis, "responseDate", "closeDate") ?? getString(opportunity, "closeDate")),
    officialUrl: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
    discoveryUrl: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
    opportunityNumber: plain(getString(opportunity, "opportunityNumber", "number")),
    sourceLastUpdatedAt: getDate(getString(opportunity, "lastUpdatedDate", "lastUpdated")),
    metadata: { eligibilityUncertain: !eligibleCountries.length && !applicantTypes.some((value) => /foreign|international/i.test(value)) },
  };
}
