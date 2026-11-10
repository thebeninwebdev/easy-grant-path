import "server-only";
import type { PipelineStage } from "mongoose";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { normalizePlainText, normalizePlainTextList, sanitizeOpportunityHtml } from "@/lib/opportunity-content";
import { Opportunity } from "@/models/Opportunity";
import { OPPORTUNITY_TYPES, type OpportunityStatus, type OpportunityType } from "@/types/opportunities";
import type { OpportunityImageMetadata } from "@/services/opportunity-extraction/image-discovery";
import type { SupportedLocale } from "@/lib/config";

export const PUBLIC_OPPORTUNITIES_PAGE_SIZE = 12;
export interface PublicOpportunity { id: string; slug: string; title: string; summary: string | null; description: string | null; organization: string | null; agency: string | null; type: OpportunityType; countries: string[]; eligibleCountries: string[]; applicantTypes: string[]; sectors: string[]; fundingMin: number | null; fundingMax: number | null; currency: string; openingDate: string | null; deadline: string | null; applicationUrl: string | null; officialUrl: string | null; discoveryUrl: string | null; opportunityNumber: string | null; status: OpportunityStatus; opportunityImage: OpportunityImageMetadata | null; organizationLogo: OpportunityImageMetadata | null; contentLanguage: "fr" | "original"; translationMissing: boolean; sourceLanguage: string | null; }
export type PublicOpportunitySort = "deadline" | "newest" | "oldest" | "funding-high" | "funding-low";
export interface PublicOpportunityFilters { search: string; type: OpportunityType | ""; country: string; sector: string; deadline: "" | "closing-soon" | "this-month" | "next-30-days" | "none"; sort: PublicOpportunitySort; page: number; }
export interface PublicOpportunityResult { items: PublicOpportunity[]; total: number; page: number; pageSize: number; totalPages: number; }
type SearchParams = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
export function parsePublicOpportunityFilters(params: SearchParams): PublicOpportunityFilters { const page = Number(first(params.page)); const deadline = first(params.deadline); const valid = ["closing-soon", "this-month", "next-30-days", "none"] as const; const sort = first(params.sort); const validSorts = ["deadline", "newest", "oldest", "funding-high", "funding-low"] as const; const requestedType = first(params.type); return { search: first(params.q)?.trim().slice(0, 120) ?? "", type: OPPORTUNITY_TYPES.includes(requestedType as OpportunityType) ? requestedType as OpportunityType : "", country: first(params.country)?.trim().slice(0, 80) ?? "", sector: first(params.sector)?.trim().slice(0, 100) ?? "", deadline: valid.includes(deadline as typeof valid[number]) ? deadline as PublicOpportunityFilters["deadline"] : "", sort: validSorts.includes(sort as typeof validSorts[number]) ? sort as PublicOpportunitySort : "deadline", page: Number.isInteger(page) && page > 0 ? page : 1 }; }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function iso(value: unknown): string | null { if (!value) return null; const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
export function serializePublicImage(value: unknown): OpportunityImageMetadata | null {
  if (!value || typeof value !== "object") return null;
  const image = value as Record<string, unknown>;
  if (typeof image.url !== "string" || typeof image.sourceUrl !== "string" || image.verified !== true) return null;
  try {
    const url = new URL(image.url);
    const sourceUrl = new URL(image.sourceUrl);
    if (!["http:", "https:"].includes(url.protocol) || !["http:", "https:"].includes(sourceUrl.protocol)) return null;
  } catch { return null; }
  return {
    url: image.url,
    sourceUrl: image.sourceUrl,
    type: image.type as OpportunityImageMetadata["type"],
    origin: image.origin as OpportunityImageMetadata["origin"],
    verified: true,
    confidence: image.confidence as OpportunityImageMetadata["confidence"],
    width: typeof image.width === "number" ? image.width : undefined,
    height: typeof image.height === "number" ? image.height : undefined,
    alt: normalizePlainText(image.alt) ?? undefined,
    discoveredAt: typeof image.discoveredAt === "string" ? image.discoveredAt : undefined,
    selectionReasons: normalizePlainTextList(image.selectionReasons),
    reviewStatus: image.reviewStatus === "approved" ? "approved" : "unreviewed",
  };
}
function localizedField(raw: Record<string, unknown>, field: "title" | "summary" | "description", locale: SupportedLocale) {
  if (locale !== "fr") return raw[field];
  const translations = raw.translations;
  if (!translations || typeof translations !== "object") return raw[field];
  const french = (translations as Record<string, unknown>).fr;
  if (!french || typeof french !== "object") return raw[field];
  const value = (french as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value : raw[field];
}
function hasFrenchEditorial(raw: Record<string, unknown>) {
  const translations = raw.translations;
  const french = translations && typeof translations === "object" ? (translations as Record<string, unknown>).fr : null;
  return Boolean(french && typeof french === "object" && Object.values(french).some((value) => typeof value === "string" && value.trim()));
}
export function serializePublicOpportunity(raw: Record<string, unknown>, locale: SupportedLocale = "en"): PublicOpportunity {
  const frenchAvailable = hasFrenchEditorial(raw);
  const metadata = raw.metadata && typeof raw.metadata === "object" ? raw.metadata as Record<string, unknown> : {};
  return {
    id: String(raw._id),
    slug: normalizePlainText(raw.slug) ?? "opportunity",
    title: normalizePlainText(localizedField(raw, "title", locale)) ?? "Untitled opportunity",
    summary: normalizePlainText(localizedField(raw, "summary", locale)),
    description: sanitizeOpportunityHtml(localizedField(raw, "description", locale)),
    organization: normalizePlainText(raw.organization),
    agency: normalizePlainText(raw.agency),
    type: raw.type as OpportunityType,
    countries: normalizePlainTextList(raw.countries),
    eligibleCountries: normalizePlainTextList(raw.eligibleCountries),
    applicantTypes: normalizePlainTextList(raw.applicantTypes),
    sectors: normalizePlainTextList(raw.sectors),
    fundingMin: typeof raw.fundingMin === "number" ? raw.fundingMin : null,
    fundingMax: typeof raw.fundingMax === "number" ? raw.fundingMax : null,
    currency: typeof raw.currency === "string" ? raw.currency : "USD",
    openingDate: iso(raw.openingDate),
    deadline: iso(raw.deadline),
    applicationUrl: typeof raw.applicationUrl === "string" ? raw.applicationUrl : null,
    officialUrl: typeof raw.officialUrl === "string" ? raw.officialUrl : null,
    discoveryUrl: typeof raw.discoveryUrl === "string" ? raw.discoveryUrl : null,
    opportunityNumber: normalizePlainText(raw.opportunityNumber),
    status: raw.status as OpportunityStatus,
    opportunityImage: serializePublicImage(raw.opportunityImage),
    organizationLogo: serializePublicImage(raw.organizationLogo),
    contentLanguage: locale === "fr" && frenchAvailable ? "fr" : "original",
    translationMissing: locale === "fr" && !frenchAvailable,
    sourceLanguage: typeof metadata.sourceLanguage === "string" ? metadata.sourceLanguage : null,
  };
}
function activeFilter() { const now = new Date(); return { verificationStatus: "verified", status: { $in: ["open", "closing_soon", "upcoming"] }, $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: now } }] }; }
function buildFilter(filters: PublicOpportunityFilters) { const conditions: Record<string, unknown>[] = [activeFilter()]; if (filters.search) { const search = { $regex: escapeRegex(filters.search), $options: "i" }; conditions.push({ $or: [{ title: search }, { organization: search }, { agency: search }, { opportunityNumber: search }] }); } if (filters.type) conditions.push({ type: filters.type }); if (filters.country) { const country = { $regex: escapeRegex(filters.country), $options: "i" }; conditions.push({ $or: [{ countries: country }, { eligibleCountries: country }] }); } if (filters.sector) conditions.push({ sectors: { $regex: escapeRegex(filters.sector), $options: "i" } }); const now = new Date(); if (filters.deadline === "none") conditions.push({ $or: [{ deadline: { $exists: false } }, { deadline: null }] }); if (filters.deadline === "closing-soon") conditions.push({ deadline: { $gte: now, $lte: new Date(now.getTime() + 14 * 86_400_000) } }); if (filters.deadline === "next-30-days") conditions.push({ deadline: { $gte: now, $lte: new Date(now.getTime() + 30 * 86_400_000) } }); if (filters.deadline === "this-month") conditions.push({ deadline: { $gte: now, $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) } }); return conditions.length === 1 ? conditions[0] : { $and: conditions }; }
function sortStages(sort: PublicOpportunitySort): PipelineStage[] { if (sort === "newest") return [{ $sort: { createdAt: -1 } }]; if (sort === "oldest") return [{ $sort: { createdAt: 1 } }]; if (sort === "funding-high") return [{ $sort: { fundingMax: -1, deadline: 1, createdAt: -1 } }]; if (sort === "funding-low") return [{ $sort: { fundingMin: 1, deadline: 1, createdAt: -1 } }]; return [{ $addFields: { deadlineRank: { $cond: [{ $eq: [{ $type: "$deadline" }, "date"] }, 0, 1] } } }, { $sort: { deadlineRank: 1, deadline: 1, createdAt: -1 } }, { $project: { deadlineRank: 0 } }]; }
export async function getPublicOpportunities(filters: PublicOpportunityFilters, locale: SupportedLocale = "en"): Promise<PublicOpportunityResult> { await connection(); await connectToDatabase(); const filter = buildFilter(filters); const skip = (filters.page - 1) * PUBLIC_OPPORTUNITIES_PAGE_SIZE; const [rawItems, total] = await Promise.all([Opportunity.aggregate([{ $match: filter }, ...sortStages(filters.sort), { $skip: skip }, { $limit: PUBLIC_OPPORTUNITIES_PAGE_SIZE }]), Opportunity.countDocuments(filter)]); return { items: (rawItems as unknown as Record<string, unknown>[]).map((raw) => serializePublicOpportunity(raw, locale)), total, page: filters.page, pageSize: PUBLIC_OPPORTUNITIES_PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PUBLIC_OPPORTUNITIES_PAGE_SIZE)) }; }
export async function getPublicOpportunityBySlug(slug: string, locale: SupportedLocale = "en") { await connection(); await connectToDatabase(); const raw = await Opportunity.findOne({ ...activeFilter(), slug }).sort({ createdAt: -1 }).lean(); return raw ? serializePublicOpportunity(raw as unknown as Record<string, unknown>, locale) : null; }
export async function getTeaserOpportunityCandidates() { await connection(); await connectToDatabase(); const rawItems = await Opportunity.find({ status: { $in: ["open", "closing_soon", "upcoming"] }, $or: [{ verificationStatus: "verified" }, { verificationStatus: "needs_review", "source.type": "api" }] }).sort({ relevanceScore: -1, deadline: 1, createdAt: -1 }).limit(24).lean(); return rawItems.map((raw) => ({ item: serializePublicOpportunity(raw as unknown as Record<string, unknown>), verified: raw.verificationStatus === "verified" })); }
