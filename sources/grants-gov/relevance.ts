import { assessOpportunityRelevance } from "@/sources/shared/relevance";
import type { NormalizedOpportunity, RelevanceResult } from "@/types/opportunities";

export function assessGrantsGovRelevance(opportunity: NormalizedOpportunity): RelevanceResult {
  return assessOpportunityRelevance(opportunity);
}
