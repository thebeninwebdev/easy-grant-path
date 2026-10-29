import type { ExtractedFields, ExtractedOpportunity } from "./types";

export function cleanText(value: unknown, maxLength = 8_000): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

export function cleanList(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;|]/) : [];
  return [...new Set(entries.map((entry) => cleanText(entry, 120)).filter((entry): entry is string => Boolean(entry)))].slice(0, 30);
}

export function normalizeDate(value: unknown): string | null {
  const text = cleanText(value, 100);
  if (!text) return null;
  const isoMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) return isoMatch[0];
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function resolvePageUrl(value: unknown, baseUrl: string): string | null {
  const text = cleanText(value, 2_000);
  if (!text) return null;
  try {
    const url = new URL(text, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function emptyExtractedOpportunity(): ExtractedOpportunity {
  return {
    title: null,
    organization: null,
    agency: null,
    summary: null,
    description: null,
    type: null,
    countries: [],
    eligibleCountries: [],
    applicantTypes: [],
    sectors: [],
    fundingMin: null,
    fundingMax: null,
    currency: null,
    openingDate: null,
    deadline: null,
    opportunityNumber: null,
    officialUrl: null,
    discoveryUrl: null,
  };
}

function hasValue(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== "";
}

export function mergeEmptyFields(target: ExtractedOpportunity, fields: ExtractedFields) {
  const next = { ...target };
  for (const [key, value] of Object.entries(fields) as Array<[keyof ExtractedOpportunity, ExtractedOpportunity[keyof ExtractedOpportunity]]>) {
    if (!hasValue(next[key]) && hasValue(value)) Object.assign(next, { [key]: value });
  }
  return next;
}

export function foundFields(data: ExtractedOpportunity) {
  return (Object.keys(data) as Array<keyof ExtractedOpportunity>).filter((key) => hasValue(data[key]));
}
