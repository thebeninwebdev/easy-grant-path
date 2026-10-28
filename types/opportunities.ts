export const OPPORTUNITY_TYPES = ["grant", "fellowship", "prize", "competition", "accelerator", "scholarship", "research_support", "startup_funding", "tender", "other"] as const;
export const OPPORTUNITY_STATUSES = ["draft", "open", "closing_soon", "closed", "upcoming", "archived"] as const;
export const VERIFICATION_STATUSES = ["unverified", "needs_review", "verified", "rejected"] as const;
export const SOURCE_TYPES = ["api", "scraper", "rss", "manual", "aggregator"] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]; export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]; export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]; export type SourceType = (typeof SOURCE_TYPES)[number];
export interface RawOpportunity { id?: string; data: Record<string, unknown>; }
export interface NormalizedOpportunity { externalId: string; title: string; summary?: string; description?: string; organization?: string; agency?: string; type?: OpportunityType; countries?: string[]; eligibleCountries?: string[]; applicantTypes?: string[]; sectors?: string[]; fundingMin?: number; fundingMax?: number; currency?: string; openingDate?: Date; deadline?: Date; officialUrl: string; discoveryUrl?: string; opportunityNumber?: string; sourceLastUpdatedAt?: Date; metadata?: Record<string, unknown>; }
export interface RelevanceResult { relevant: boolean; score: number; reasons: string[]; }
export interface OpportunitySource { slug: string; name: string; type: SourceType; fetch(): Promise<RawOpportunity[]>; normalize(raw: RawOpportunity): Promise<NormalizedOpportunity | null>; assessRelevance(opportunity: NormalizedOpportunity): RelevanceResult; }
