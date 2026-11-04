import 'server-only';
import { matchOpportunity } from '@/lib/opportunity-matching';
import { getTeaserOpportunityCandidates, type PublicOpportunity } from '@/lib/public-opportunities';
import type { DevelopmentProfile } from '@/lib/user-profile';

export interface OpportunityPreview {
  slug: string; title: string; organization: string | null; type: PublicOpportunity['type']; fundingMin: number | null; fundingMax: number | null;
  currency: string; deadline: string | null; countries: string[]; sectors: string[]; summary: string | null; descriptionExcerpt: string | null; verified: boolean;
}

function plain(value: string | null) { return value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null; }

export async function getRegistrationOpportunity(profile: DevelopmentProfile): Promise<{ opportunity: OpportunityPreview | null; strong: boolean }> {
  const candidates = await getTeaserOpportunityCandidates();
  const ranked = candidates.flatMap(({ item, verified }) => {
    const match = matchOpportunity(item, profile);
    return match ? [{ item, verified, score: match.score }] : [];
  }).sort((a, b) => b.score - a.score || Number(b.verified) - Number(a.verified));
  const selected = ranked[0];
  if (!selected) return { opportunity: null, strong: false };
  const description = plain(selected.item.description);
  return {
    strong: selected.score >= 17,
    opportunity: {
      slug: selected.item.slug, type: selected.item.type, title: selected.item.title,
      organization: selected.item.agency || selected.item.organization, fundingMin: selected.item.fundingMin,
      fundingMax: selected.item.fundingMax, currency: selected.item.currency, deadline: selected.item.deadline,
      countries: selected.item.eligibleCountries.length ? selected.item.eligibleCountries : selected.item.countries,
      sectors: selected.item.sectors, summary: selected.item.summary,
      descriptionExcerpt: description ? description.slice(0, 360) : null, verified: selected.verified,
    },
  };
}
