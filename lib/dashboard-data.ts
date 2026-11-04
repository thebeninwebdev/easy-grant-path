import 'server-only';
import { connection } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { matchOpportunity, type OpportunityMatch } from '@/lib/opportunity-matching';
import { normalizePlainText, normalizePlainTextList, sanitizeOpportunityHtml } from '@/lib/opportunity-content';
import { serializePublicImage, type PublicOpportunity } from '@/lib/public-opportunities';
import type { DevelopmentProfile } from '@/lib/user-profile';
import { Opportunity } from '@/models/Opportunity';
import type { OpportunityStatus, OpportunityType } from '@/types/opportunities';

export interface MatchedOpportunity { opportunity: PublicOpportunity; match: OpportunityMatch }
export interface DashboardOpportunityData { recommendations: MatchedOpportunity[]; closingSoon: MatchedOpportunity[]; potentialMatchCount: number; closingSoonCount: number }

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serialize(raw: Record<string, unknown>): PublicOpportunity {
  return {
    id: String(raw._id), slug: normalizePlainText(raw.slug) ?? 'opportunity', title: normalizePlainText(raw.title) ?? 'Untitled opportunity',
    summary: normalizePlainText(raw.summary), description: sanitizeOpportunityHtml(raw.description), organization: normalizePlainText(raw.organization),
    agency: normalizePlainText(raw.agency), type: raw.type as OpportunityType, countries: normalizePlainTextList(raw.countries),
    eligibleCountries: normalizePlainTextList(raw.eligibleCountries), applicantTypes: normalizePlainTextList(raw.applicantTypes),
    sectors: normalizePlainTextList(raw.sectors), fundingMin: typeof raw.fundingMin === 'number' ? raw.fundingMin : null,
    fundingMax: typeof raw.fundingMax === 'number' ? raw.fundingMax : null, currency: typeof raw.currency === 'string' ? raw.currency : 'USD',
    openingDate: iso(raw.openingDate), deadline: iso(raw.deadline), officialUrl: typeof raw.officialUrl === 'string' ? raw.officialUrl : null,
    opportunityNumber: normalizePlainText(raw.opportunityNumber), status: raw.status as OpportunityStatus,
    opportunityImage: serializePublicImage(raw.opportunityImage), organizationLogo: serializePublicImage(raw.organizationLogo),
  };
}

function deadlineValue(value: string | null) { return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER; }

export async function getMatchedOpportunityCandidates(profile: DevelopmentProfile, limit = 240): Promise<MatchedOpportunity[]> {
  await connection();
  await connectToDatabase();
  const raw = await Opportunity.find({ verificationStatus: 'verified', status: { $in: ['open', 'closing_soon', 'upcoming'] } })
    .sort({ relevanceScore: -1, deadline: 1, createdAt: -1 }).limit(limit).lean();
  return raw.map((item) => serialize(item as unknown as Record<string, unknown>))
    .map((opportunity) => ({ opportunity, match: matchOpportunity(opportunity, profile) }))
    .filter((item): item is MatchedOpportunity => item.match !== null)
    .sort((a, b) => b.match.score - a.match.score || deadlineValue(a.opportunity.deadline) - deadlineValue(b.opportunity.deadline));
}

export async function getDashboardOpportunityData(profile: DevelopmentProfile): Promise<DashboardOpportunityData> {
  const matched = await getMatchedOpportunityCandidates(profile);
  const now = Date.now();
  const inFourteenDays = now + 14 * 86_400_000;
  const closingSoon = matched.filter(({ opportunity }) => {
    const deadline = opportunity.deadline ? new Date(opportunity.deadline).getTime() : Number.NaN;
    return Number.isFinite(deadline) && deadline >= now && deadline <= inFourteenDays;
  }).sort((a, b) => deadlineValue(a.opportunity.deadline) - deadlineValue(b.opportunity.deadline));
  return { recommendations: matched.slice(0, 6), closingSoon: closingSoon.slice(0, 4), potentialMatchCount: matched.length, closingSoonCount: closingSoon.length };
}
