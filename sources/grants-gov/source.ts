import type { OpportunitySource, RawOpportunity } from "@/types/opportunities";
import { fetchGrantsGovOpportunity, searchGrantsGov } from "./client";
import { normalizeGrantsGov } from "./normalize";
import { assessGrantsGovRelevance } from "./relevance";

const keywords = [
  "Africa", "West Africa", "Sub-Saharan Africa", "Francophone Africa", "ECOWAS",
  "Côte d'Ivoire", "Cote d'Ivoire", "Ivory Coast", "Nigeria", "Ghana", "Senegal",
  "Benin", "Togo", "Mali", "Burkina Faso", "Guinea", "Liberia", "Sierra Leone",
  "Gambia", "Guinea-Bissau", "Niger", "Cabo Verde",
];

export const grantsGovSource: OpportunitySource = {
  slug: "grants-gov", name: "Grants.gov", type: "api",
  async fetch() {
    const ids = new Set<string>();
    for (const keyword of keywords) {
      for (let page = 1; ; page += 1) {
        const { items, total } = await searchGrantsGov(keyword, page);
        for (const item of items) {
          const id = item.opportunityId ?? item.id;
          if (id !== undefined) ids.add(String(id));
        }
        if (!items.length || page * 100 >= total) break;
      }
    }
    const details: RawOpportunity[] = []; const values = [...ids];
    for (let index = 0; index < values.length; index += 5) {
      details.push(...await Promise.all(values.slice(index, index + 5).map(async (id) => ({ id, data: await fetchGrantsGovOpportunity(id) }))));
    }
    return details;
  },
  async normalize(raw) { return normalizeGrantsGov(raw); },
  assessRelevance: assessGrantsGovRelevance,
};
