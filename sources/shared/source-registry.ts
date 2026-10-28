import type { OpportunitySource } from "@/types/opportunities"; import { grantsGovSource } from "@/sources/grants-gov/source";
const sources: Record<string, OpportunitySource> = { [grantsGovSource.slug]: grantsGovSource }; export function getOpportunitySource(slug: string) { return sources[slug]; } export function getOpportunitySources() { return Object.values(sources); }
