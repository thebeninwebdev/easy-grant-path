import type { OpportunityType } from "@/types/opportunities";
import type { IdentityConfidence, IdentitySource, RankedResearchSource } from "./opportunity-identity";
import type { OpportunityImageMetadata } from "./image-discovery";

export type ExtractionMethod = "json-ld" | "open-graph" | "meta" | "semantic-html" | "text-heuristics" | "ai";

export interface ExtractedOpportunity {
  title: string | null;
  organization: string | null;
  agency: string | null;
  type: OpportunityType | null;
  summary: string | null;
  description: string | null;
  countries: string[];
  eligibleCountries: string[];
  applicantTypes: string[];
  sectors: string[];
  fundingMin: number | null;
  fundingMax: number | null;
  currency: string | null;
  openingDate: string | null;
  deadline: string | null;
  opportunityNumber: string | null;
  officialUrl: string | null;
  discoveryUrl: string | null;
  opportunityImage: OpportunityImageMetadata | null;
  organizationLogo: OpportunityImageMetadata | null;
}

export interface OpportunityIdentityMeta {
  submittedUrl: string;
  providedOpportunityName: string | null;
  detectedOpportunityName: string | null;
  resolvedSearchName: string | null;
  canonicalOpportunityName: string | null;
  source: IdentitySource | null;
  confidence: IdentityConfidence | null;
  organizationHint: string | null;
  originalDomain: string;
  searchQuery: string | null;
  cacheKey: string | null;
}

export interface ExtractionMeta {
  sourceUrl: string;
  finalUrl: string;
  methods: ExtractionMethod[];
  warnings: string[];
  fieldsFound: string[];
  requiresName: boolean;
  crawlFailed: boolean;
  identity: OpportunityIdentityMeta;
  research: {
    cacheHit: boolean;
    resultCount: number;
    acceptedResultCount: number;
    sources: RankedResearchSource[];
  } | null;
  images?: {
    candidateCount: number;
    opportunityImage: OpportunityImageMetadata | null;
    organizationLogo: OpportunityImageMetadata | null;
    inspectedSources: string[];
    rejectedCandidates: Array<{ url: string; reasons: string[] }>;
    cacheHits: number;
    durationMs: number;
  };
}

export interface OpportunityExtractionResult {
  data: ExtractedOpportunity;
  meta: ExtractionMeta;
}

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  contentType: string;
}

export type ExtractedFields = Partial<ExtractedOpportunity>;

