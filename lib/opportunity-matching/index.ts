import type { PublicOpportunity } from '@/lib/public-opportunities';
import type { DevelopmentProfile } from '@/lib/user-profile';

export type MatchConfidence = 'confirmed' | 'potential' | 'unknown';
export interface MatchReason { confidence: MatchConfidence; text: string }
export interface OpportunityMatch { score: number; label: 'Strong potential match' | 'Good potential match' | 'Worth exploring'; reasons: MatchReason[] }

const countryData: Record<string, [string, string[], string[]]> = {
  CI: ['Cote d\'Ivoire', ['ci', 'cote d ivoire', 'ivory coast'], ['west africa', 'africa', 'sub saharan africa']],
  BJ: ['Benin', ['bj', 'benin'], ['west africa', 'africa', 'sub saharan africa']],
  BF: ['Burkina Faso', ['bf', 'burkina faso'], ['west africa', 'africa', 'sub saharan africa']],
  GH: ['Ghana', ['gh', 'ghana'], ['west africa', 'africa', 'sub saharan africa']],
  GN: ['Guinea', ['gn', 'guinea'], ['west africa', 'africa', 'sub saharan africa']],
  ML: ['Mali', ['ml', 'mali'], ['west africa', 'africa', 'sub saharan africa']],
  NE: ['Niger', ['ne', 'niger'], ['west africa', 'africa', 'sub saharan africa']],
  NG: ['Nigeria', ['ng', 'nigeria'], ['west africa', 'africa', 'sub saharan africa']],
  SN: ['Senegal', ['sn', 'senegal'], ['west africa', 'africa', 'sub saharan africa']],
  TG: ['Togo', ['tg', 'togo'], ['west africa', 'africa', 'sub saharan africa']],
  CM: ['Cameroon', ['cm', 'cameroon'], ['central africa', 'africa', 'sub saharan africa']],
  KE: ['Kenya', ['ke', 'kenya'], ['east africa', 'africa', 'sub saharan africa']],
  ZA: ['South Africa', ['za', 'south africa'], ['southern africa', 'africa', 'sub saharan africa']],
};

const applicantAliases: Record<string, string[]> = {
  individual: ['individual', 'person', 'entrepreneur'],
  student: ['student', 'learner', 'undergraduate', 'graduate'],
  startup_sme: ['startup', 'start up', 'sme', 'small business', 'business', 'enterprise', 'company', 'social enterprise'],
  ngo_nonprofit: ['ngo', 'nonprofit', 'non profit', 'civil society', 'charity', 'non governmental'],
  researcher_academic: ['researcher', 'academic', 'university', 'research institution', 'faculty'],
  community_organization: ['community organization', 'community based', 'cbo', 'grassroots'],
  other: ['other'],
};

const sectorGroups: Record<string, string[]> = {
  agriculture: ['agriculture', 'agricultural', 'agribusiness', 'farming', 'farmer', 'agritech', 'food systems'],
  technology: ['technology', 'tech', 'digital', 'innovation', 'software', 'ict', 'artificial intelligence'],
  youth: ['youth', 'young people', 'adolescent'],
  education: ['education', 'school', 'learning', 'teacher', 'training'],
  climate: ['climate', 'environment', 'sustainability', 'renewable', 'conservation', 'green'],
  health: ['health', 'healthcare', 'medical', 'public health', 'wellbeing'],
  women_girls: ['women', 'girls', 'gender', 'female'],
  community_development: ['community development', 'local development', 'social impact', 'livelihood'],
  research: ['research', 'science', 'academic'],
  leadership: ['leadership', 'governance', 'public service'],
  entrepreneurship: ['entrepreneurship', 'entrepreneur', 'enterprise', 'small business', 'startup', 'sme'],
  scholarships_study: ['scholarship', 'study', 'tuition', 'degree', 'university'],
};

export function normalizeMatchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function countryName(code: string) { return countryData[code.toUpperCase()]?.[0] ?? code.toUpperCase(); }
export function applicantName(value: string) {
  return ({ startup_sme: 'Startup / SME', ngo_nonprofit: 'NGO / Nonprofit', researcher_academic: 'Researcher / Academic', community_organization: 'Community organization' } as Record<string, string>)[value] ?? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function interestName(value: string) { return value.replaceAll('_', ' / ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function countryResult(item: PublicOpportunity, code: string) {
  const values = item.eligibleCountries.length ? item.eligibleCountries : item.countries;
  if (!values.length) return { state: 'unknown' as const, text: 'Geographic eligibility is not specified' };
  const normalized = values.map(normalizeMatchText);
  const country = countryData[code.toUpperCase()];
  const aliases = country?.[1] ?? [normalizeMatchText(code)];
  const regions = country?.[2] ?? [];
  if (normalized.some((value) => value === 'global' || value.includes('worldwide') || value.includes('all countries') || aliases.some((alias) => value.includes(alias)) || regions.some((region) => value === region || value.includes(`from ${region}`) || value.includes(`${region} countries`)))) {
    return { state: 'confirmed' as const, text: `${countryName(code)} appears in the eligible region` };
  }
  return { state: 'incompatible' as const, text: `${countryName(code)} is not listed as eligible` };
}

function applicantResult(item: PublicOpportunity, applicantType: string) {
  if (!item.applicantTypes.length) return { state: 'unknown' as const, text: 'Applicant eligibility needs review' };
  const text = normalizeMatchText(item.applicantTypes.join(' '));
  const aliases = applicantAliases[applicantType] ?? [normalizeMatchText(applicantType)];
  if (aliases.some((alias) => text.includes(alias))) return { state: 'confirmed' as const, text: `Accepts ${applicantName(applicantType).toLowerCase()} applicants` };
  return { state: 'incompatible' as const, text: `Does not list ${applicantName(applicantType).toLowerCase()} applicants` };
}

export function matchOpportunity(item: PublicOpportunity, profile: DevelopmentProfile): OpportunityMatch | null {
  const country = countryResult(item, profile.countryCode);
  if (country.state === 'incompatible') return null;
  const applicant = applicantResult(item, profile.applicantType);
  if (applicant.state === 'incompatible') return null;
  let score = 0;
  const reasons: MatchReason[] = [];
  if (country.state === 'confirmed') { score += 8; reasons.push({ confidence: 'confirmed', text: country.text }); }
  else reasons.push({ confidence: 'unknown', text: country.text });
  if (applicant.state === 'confirmed') { score += 6; reasons.push({ confidence: 'confirmed', text: applicant.text }); }
  else reasons.push({ confidence: 'unknown', text: applicant.text });
  const haystack = normalizeMatchText([item.title, item.summary ?? '', ...item.sectors].join(' '));
  const matchedInterests = profile.interests.filter((interest) => (sectorGroups[interest] ?? [normalizeMatchText(interest)]).some((alias) => haystack.includes(alias)));
  if (matchedInterests.length) {
    score += Math.min(6, matchedInterests.length * 3);
    reasons.push({ confidence: 'confirmed', text: `Matches your ${matchedInterests.map(interestName).join(' and ').toLowerCase()} interests` });
  }
  const preferredTypes = profile.opportunityTypes.length ? profile.opportunityTypes : profile.inferredOpportunityTypes;
  if (preferredTypes.includes(item.type)) {
    score += 4;
    reasons.push({ confidence: 'confirmed', text: `${interestName(item.type)} is one of your preferred opportunity types` });
  }
  if (!matchedInterests.length && !preferredTypes.includes(item.type)) reasons.push({ confidence: 'potential', text: 'The focus area may still be relevant to your goals' });
  if (item.deadline) {
    const days = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86_400_000);
    if (days >= 0 && days <= 30) score += 1;
  }
  return { score, label: score >= 17 ? 'Strong potential match' : score >= 10 ? 'Good potential match' : 'Worth exploring', reasons: reasons.slice(0, 4) };
}
