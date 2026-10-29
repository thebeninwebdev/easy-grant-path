import type { OpportunityType } from "@/types/opportunities";

export type ExtractionMethod = "json-ld" | "open-graph" | "meta" | "semantic-html" | "text-heuristics";

export interface ExtractedOpportunity {
  title: string | null;
  organization: string | null;
  agency: string | null;
  summary: string | null;
  description: string | null;
  type: OpportunityType | null;
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
}

export interface ExtractionMeta {
  sourceUrl: string;
  finalUrl: string;
  methods: ExtractionMethod[];
  warnings: string[];
  fieldsFound: string[];
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
