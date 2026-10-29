import "server-only";

import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Opportunity } from "@/models/Opportunity";
import {
  OPPORTUNITY_TYPES,
  type OpportunityStatus,
  type OpportunityType,
  type VerificationStatus,
} from "@/types/opportunities";

export const ADMIN_OPPORTUNITIES_PAGE_SIZE = 20;
export const ADMIN_OPPORTUNITY_VIEWS = ["needs_review", "verified", "rejected", "archived"] as const;

export type AdminOpportunityView = (typeof ADMIN_OPPORTUNITY_VIEWS)[number];
export type DeadlineFilter = "active" | "passed" | "none" | "";

export interface AdminOpportunityFilters {
  view: AdminOpportunityView;
  query: string;
  source: string;
  type: OpportunityType | "";
  deadline: DeadlineFilter;
  relevanceMin: number | null;
  relevanceMax: number | null;
  page: number;
}

export interface AdminOpportunityItem {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  organization: string | null;
  agency: string | null;
  type: OpportunityType;
  countries: string[];
  eligibleCountries: string[];
  applicantTypes: string[];
  sectors: string[];
  fundingMin: number | null;
  fundingMax: number | null;
  currency: string;
  openingDate: string | null;
  deadline: string | null;
  officialUrl: string | null;
  discoveryUrl: string | null;
  opportunityNumber: string | null;
  source: { slug: string; name: string; type: string; externalId: string };
  sourceLastUpdatedAt: string | null;
  lastCheckedAt: string | null;
  status: OpportunityStatus;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  relevanceScore: number;
  relevanceReasons: string[];
  createdAt: string;
}

export interface AdminOpportunityCounts {
  needs_review: number;
  verified: number;
  rejected: number;
  archived: number;
}

export interface AdminOpportunityResult {
  items: AdminOpportunityItem[];
  counts: AdminOpportunityCounts;
  sourceOptions: Array<{ slug: string; name: string }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type SearchParams = Record<string, string | string[] | undefined>;
type MongoFilter = Record<string, unknown>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function boundedScore(value: string | undefined) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : null;
}

export function parseAdminOpportunityFilters(params: SearchParams): AdminOpportunityFilters {
  const requestedView = first(params.view);
  const requestedType = first(params.type);
  const requestedDeadline = first(params.deadline);
  const requestedPage = Number(first(params.page));

  return {
    view: ADMIN_OPPORTUNITY_VIEWS.includes(requestedView as AdminOpportunityView)
      ? (requestedView as AdminOpportunityView)
      : "needs_review",
    query: first(params.query)?.trim().slice(0, 120) ?? "",
    source: first(params.source)?.trim().slice(0, 80) ?? "",
    type: OPPORTUNITIES_TYPE(requestedType),
    deadline: (["active", "passed", "none"] as const).includes(requestedDeadline as Exclude<DeadlineFilter, "">)
      ? (requestedDeadline as DeadlineFilter)
      : "",
    relevanceMin: boundedScore(first(params.relevanceMin)),
    relevanceMax: boundedScore(first(params.relevanceMax)),
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

function OPPORTUNITIES_TYPE(value: string | undefined): OpportunityType | "" {
  return OPPORTUNITY_TYPES.includes(value as OpportunityType) ? (value as OpportunityType) : "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function viewFilter(view: AdminOpportunityView): MongoFilter {
  if (view === "archived") return { status: "archived" };
  return { verificationStatus: view, status: { $ne: "archived" } };
}

function buildFilter(filters: AdminOpportunityFilters): MongoFilter {
  const conditions: MongoFilter[] = [viewFilter(filters.view)];

  if (filters.query) {
    const search = { $regex: escapeRegex(filters.query), $options: "i" };
    conditions.push({
      $or: [
        { title: search },
        { organization: search },
        { agency: search },
        { opportunityNumber: search },
      ],
    });
  }
  if (filters.source) conditions.push({ "source.slug": filters.source });
  if (filters.type) conditions.push({ type: filters.type });

  const now = new Date();
  if (filters.deadline === "active") conditions.push({ deadline: { $gte: now } });
  if (filters.deadline === "passed") conditions.push({ deadline: { $lt: now } });
  if (filters.deadline === "none") conditions.push({ $or: [{ deadline: { $exists: false } }, { deadline: null }] });

  if (filters.relevanceMin !== null || filters.relevanceMax !== null) {
    conditions.push({
      relevanceScore: {
        ...(filters.relevanceMin !== null ? { $gte: filters.relevanceMin } : {}),
        ...(filters.relevanceMax !== null ? { $lte: filters.relevanceMax } : {}),
      },
    });
  }

  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeOpportunity(raw: Record<string, unknown>): AdminOpportunityItem {
  const source = raw.source as Record<string, unknown>;
  return {
    id: String(raw._id),
    title: String(raw.title),
    summary: typeof raw.summary === "string" ? raw.summary : null,
    description: typeof raw.description === "string" ? raw.description : null,
    organization: typeof raw.organization === "string" ? raw.organization : null,
    agency: typeof raw.agency === "string" ? raw.agency : null,
    type: raw.type as OpportunityType,
    countries: Array.isArray(raw.countries) ? raw.countries.map(String) : [],
    eligibleCountries: Array.isArray(raw.eligibleCountries) ? raw.eligibleCountries.map(String) : [],
    applicantTypes: Array.isArray(raw.applicantTypes) ? raw.applicantTypes.map(String) : [],
    sectors: Array.isArray(raw.sectors) ? raw.sectors.map(String) : [],
    fundingMin: typeof raw.fundingMin === "number" ? raw.fundingMin : null,
    fundingMax: typeof raw.fundingMax === "number" ? raw.fundingMax : null,
    currency: typeof raw.currency === "string" ? raw.currency : "USD",
    openingDate: iso(raw.openingDate),
    deadline: iso(raw.deadline),
    officialUrl: typeof raw.officialUrl === "string" ? raw.officialUrl : null,
    discoveryUrl: typeof raw.discoveryUrl === "string" ? raw.discoveryUrl : null,
    opportunityNumber: typeof raw.opportunityNumber === "string" ? raw.opportunityNumber : null,
    source: {
      slug: String(source.slug),
      name: String(source.name),
      type: String(source.type),
      externalId: String(source.externalId),
    },
    sourceLastUpdatedAt: iso(raw.sourceLastUpdatedAt),
    lastCheckedAt: iso(raw.lastCheckedAt),
    status: raw.status as OpportunityStatus,
    verificationStatus: raw.verificationStatus as VerificationStatus,
    verifiedAt: iso(raw.verifiedAt),
    relevanceScore: typeof raw.relevanceScore === "number" ? raw.relevanceScore : 0,
    relevanceReasons: Array.isArray(raw.relevanceReasons) ? raw.relevanceReasons.map(String) : [],
    createdAt: iso(raw.createdAt) ?? new Date(0).toISOString(),
  };
}

export async function getAdminOpportunities(filters: AdminOpportunityFilters): Promise<AdminOpportunityResult> {
  await connection();
  await connectToDatabase();
  const filter = buildFilter(filters);
  const skip = (filters.page - 1) * ADMIN_OPPORTUNITIES_PAGE_SIZE;

  const [rawItems, total, needsReview, verified, rejected, archived, rawSources] = await Promise.all([
    Opportunity.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(ADMIN_OPPORTUNITIES_PAGE_SIZE)
      .lean(),
    Opportunity.countDocuments(filter),
    Opportunity.countDocuments(viewFilter("needs_review")),
    Opportunity.countDocuments(viewFilter("verified")),
    Opportunity.countDocuments(viewFilter("rejected")),
    Opportunity.countDocuments(viewFilter("archived")),
    Opportunity.aggregate<{ _id: string; name: string }>([
      { $group: { _id: "$source.slug", name: { $first: "$source.name" } } },
      { $sort: { name: 1 } },
    ]),
  ]);

  return {
    items: (rawItems as unknown as Record<string, unknown>[]).map(serializeOpportunity),
    counts: { needs_review: needsReview, verified, rejected, archived },
    sourceOptions: rawSources.map((source) => ({ slug: source._id, name: source.name })),
    total,
    page: filters.page,
    pageSize: ADMIN_OPPORTUNITIES_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_OPPORTUNITIES_PAGE_SIZE)),
  };
}
