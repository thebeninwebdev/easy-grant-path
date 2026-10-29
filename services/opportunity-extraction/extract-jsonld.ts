import type { CheerioAPI } from "cheerio";
import type { OpportunityType } from "@/types/opportunities";
import { cleanList, cleanText, normalizeDate, resolvePageUrl } from "./normalize-extracted-opportunity";
import type { ExtractedFields } from "./types";

type JsonObject = Record<string, unknown>;

function objects(value: unknown): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(objects);
  if (!value || typeof value !== "object") return [];
  const object = value as JsonObject;
  return [object, ...objects(object["@graph"]), ...objects(object.mainEntity), ...objects(object.subjectOf)];
}

function nestedName(value: unknown): string | null {
  if (typeof value === "string") return cleanText(value, 200);
  if (value && typeof value === "object") return cleanText((value as JsonObject).name, 200);
  return null;
}

function countryNames(value: unknown): string[] {
  if (typeof value === "string") return cleanList(value);
  if (Array.isArray(value)) return value.flatMap(countryNames);
  if (!value || typeof value !== "object") return [];
  const item = value as JsonObject;
  return cleanList([item.name, item.addressCountry, item.eligibleRegion].filter(Boolean));
}

function mapType(value: unknown, title: string | null): OpportunityType | null {
  const text = `${Array.isArray(value) ? value.join(" ") : String(value ?? "")} ${title ?? ""}`.toLowerCase();
  if (text.includes("fellowship")) return "fellowship";
  if (text.includes("scholarship")) return "scholarship";
  if (text.includes("competition")) return "competition";
  if (text.includes("prize") || text.includes("award")) return "prize";
  if (text.includes("accelerator")) return "accelerator";
  if (text.includes("tender")) return "tender";
  if (text.includes("grant") || text.includes("monetarygrant")) return "grant";
  return null;
}

function monetary(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const amount = value as JsonObject;
  const rawValue = typeof amount.value === "object" && amount.value ? amount.value as JsonObject : amount;
  const minimum = Number(rawValue.minValue ?? rawValue.value);
  const maximum = Number(rawValue.maxValue ?? rawValue.value);
  return {
    fundingMin: Number.isFinite(minimum) ? minimum : null,
    fundingMax: Number.isFinite(maximum) ? maximum : null,
    currency: cleanText(amount.currency ?? rawValue.currency, 3)?.toUpperCase() ?? null,
  };
}

export function extractJsonLd($: CheerioAPI, baseUrl: string): ExtractedFields {
  const candidates: JsonObject[] = [];
  $("script[type='application/ld+json']").each((_, element) => {
    try {
      candidates.push(...objects(JSON.parse($(element).text())));
    } catch {
      // A malformed JSON-LD block should not prevent other extraction methods.
    }
  });

  const candidate = candidates.find((item) => {
    const type = String(item["@type"] ?? "").toLowerCase();
    return /(grant|award|scholarship|fellowship|opportunity|program|event|creativework)/.test(type)
      || Boolean(item.applicationDeadline || item.funder || item.sponsor);
  }) ?? candidates.find((item) => item.name || item.headline);
  if (!candidate) return {};

  const title = cleanText(candidate.name ?? candidate.headline, 300);
  const identifier = typeof candidate.identifier === "object" && candidate.identifier
    ? (candidate.identifier as JsonObject).value
    : candidate.identifier;
  const provider = candidate.funder ?? candidate.sponsor ?? candidate.provider ?? candidate.publisher ?? candidate.author;
  const amount = monetary(candidate.amount ?? candidate.monetaryAmount ?? candidate.funding);

  return {
    title,
    organization: nestedName(provider),
    summary: cleanText(candidate.abstract ?? candidate.disambiguatingDescription, 1_000),
    description: cleanText(candidate.description, 8_000),
    type: mapType(candidate["@type"], title),
    eligibleCountries: countryNames(candidate.eligibleRegion ?? candidate.spatialCoverage ?? candidate.applicantLocationRequirements),
    applicantTypes: cleanList(candidate.eligibleCustomerType ?? candidate.audience),
    sectors: cleanList(candidate.category ?? candidate.keywords),
    openingDate: normalizeDate(candidate.datePosted ?? candidate.startDate ?? candidate.applicationStartDate),
    deadline: normalizeDate(candidate.applicationDeadline ?? candidate.validThrough ?? candidate.endDate),
    opportunityNumber: cleanText(identifier, 120),
    officialUrl: resolvePageUrl(candidate.url ?? candidate.sameAs, baseUrl),
    ...amount,
  };
}
