import 'server-only';
import { connection } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { matchOpportunity, type OpportunityMatch } from '@/lib/opportunity-matching';
import { normalizePlainText, normalizePlainTextList, sanitizeOpportunityHtml } from '@/lib/opportunity-content';
import { serializePublicOpportunity, type PublicOpportunity } from '@/lib/public-opportunities';
import type { SupportedLocale } from '@/lib/config';
import type { DevelopmentProfile } from '@/lib/user-profile';
import { Opportunity } from '@/models/Opportunity';
import type { OpportunityStatus, OpportunityType } from '@/types/opportunities';

export interface MatchedOpportunity { opportunity: PublicOpportunity; match: OpportunityMatch }
export interface DashboardOpportunityData { recommendations: MatchedOpportunity[]; closingSoon: MatchedOpportunity[]; potentialMatchCount: number; closingSoonCount: number }

function deadlineValue(value: string | null) { return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER; }

export async function getMatchedOpportunityCandidates(profile: DevelopmentProfile, limit = 240, locale: SupportedLocale = "en"): Promise<MatchedOpportunity[]> {
  await connection();
  await connectToDatabase();
  const raw = await Opportunity.find({ verificationStatus: 'verified', status: { $in: ['open', 'closing_soon', 'upcoming'] } })
    .sort({ relevanceScore: -1, deadline: 1, createdAt: -1 }).limit(limit).lean();
  return raw.map((item) => serializePublicOpportunity(item as unknown as Record<string, unknown>, locale))
    .map((opportunity) => ({ opportunity, match: matchOpportunity(opportunity, profile) }))
    .filter((item): item is MatchedOpportunity => item.match !== null)
    .sort((a, b) => b.match.score - a.match.score || deadlineValue(a.opportunity.deadline) - deadlineValue(b.opportunity.deadline));
}

export async function getDashboardOpportunityData(profile: DevelopmentProfile, locale: SupportedLocale = "en"): Promise<DashboardOpportunityData> {
  const matched = await getMatchedOpportunityCandidates(profile, 240, locale);
  const now = Date.now();
  const inFourteenDays = now + 14 * 86_400_000;
  const closingSoon = matched.filter(({ opportunity }) => {
    const deadline = opportunity.deadline ? new Date(opportunity.deadline).getTime() : Number.NaN;
    return Number.isFinite(deadline) && deadline >= now && deadline <= inFourteenDays;
  }).sort((a, b) => deadlineValue(a.opportunity.deadline) - deadlineValue(b.opportunity.deadline));
  return { recommendations: matched.slice(0, 6), closingSoon: closingSoon.slice(0, 4), potentialMatchCount: matched.length, closingSoonCount: closingSoon.length };
}
