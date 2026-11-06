import type { OpportunitySource } from "@/types/opportunities";
import { afdbAccfSource } from "@/sources/afdb-accf/source";
import { ecowasSource } from "@/sources/ecowas/source";
import { grantsGovSource } from "@/sources/grants-gov/source";
import { unMptfSource } from "@/sources/un-mptf/source";
import { undpSource } from "@/sources/undp/source";
const sources: Record<string, OpportunitySource> = Object.fromEntries([grantsGovSource, ecowasSource, undpSource, afdbAccfSource, unMptfSource].map((source) => [source.slug, source]));
export function getOpportunitySource(slug: string) { return sources[slug]; }
export function getOpportunitySources() { return Object.values(sources); }
export function isRegisteredOpportunitySource(slug: string) { return Boolean(sources[slug]); }