export type IdentitySource = "admin" | "crawler" | "metadata";
export type IdentityConfidence = "high" | "medium" | "low";

export interface OpportunityIdentity {
  searchName: string;
  source: IdentitySource;
  confidence: IdentityConfidence;
  detectedName: string | null;
  organizationHint: string | null;
  originalDomain: string;
  searchQuery: string;
  cacheKey: string;
}

export interface IdentityInput {
  submittedUrl: string;
  providedName?: string | null;
  structuredTitle?: string | null;
  openGraphTitle?: string | null;
  headingTitle?: string | null;
  prominentTitle?: string | null;
  pageTitle?: string | null;
  organization?: string | null;
}

export interface ResearchSource {
  url: string;
  title: string;
  snippet?: string | null;
}

export interface RankedResearchSource extends ResearchSource {
  accepted: boolean;
  priority: number;
  reason: string;
}

const GENERIC_TITLES = [
  /^home$/i,
  /^opportunities?$/i,
  /^funding(?: opportunities)?$/i,
  /^grants?$/i,
  /^apply now$/i,
  /^applications? (?:now )?open$/i,
  /^call for applications?$/i,
  /^latest opportunities?$/i,
  /^[a-z0-9&.' -]{2,35}\s+(?:opportunities?|funding|grants?)$/i,
];

const AGGREGATOR_DOMAINS = ["opportunitydesk.org", "opportunitiesforafricans.com", "fundsforngos.org", "scholarshipscorner.website"];
const INSTITUTIONAL_SUFFIXES = [".gov", ".gov.ng", ".int", ".edu"];
const STOP_WORDS = new Set(["a", "an", "and", "applications", "apply", "call", "for", "from", "now", "of", "open", "programme", "program", "the", "to"]);

function words(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) ?? [];
}

function normalizedWords(value: string) {
  return words(value).filter((word) => !STOP_WORDS.has(word));
}

function years(value: string) {
  return [...new Set(value.match(/\b20\d{2}\b/g) ?? [])];
}

export function cleanOpportunityTitle(value: string | null | undefined) {
  const cleaned = value?.replace(/\s+/g, " ").trim().replace(/\s+(?:[-\u2013\u2014|:])\s+(?:applications? (?:are )?open|apply now)$/i, "") ?? "";
  if (!cleaned) return null;
  const parts = cleaned.split(/\s+(?:[|\u2013\u2014]|-\s)\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const suffix = parts.at(-1) ?? "";
    const prefix = parts.slice(0, -1).join(" - ");
    if (isMeaningfulOpportunityTitle(prefix) && suffix.length <= 60 && !/\b20\d{2}\b/.test(suffix) && !/\b(grant|award|challenge|fellowship|fund|competition|programme|program)\b/i.test(suffix)) return prefix;
  }
  return cleaned.slice(0, 300);
}

export function isGenericOpportunityTitle(value: string | null | undefined) {
  const cleaned = value?.replace(/\s+/g, " ").trim() ?? "";
  const primary = cleaned.split(/\s+(?:\||-)\s*/)[0]?.trim() ?? cleaned;
  return !cleaned || GENERIC_TITLES.some((pattern) => pattern.test(cleaned) || pattern.test(primary));
}

export function isMeaningfulOpportunityTitle(value: string | null | undefined) {
  const cleaned = cleanOpportunityTitle(value);
  return Boolean(cleaned && !isGenericOpportunityTitle(cleaned) && normalizedWords(cleaned).length >= 2);
}

export function originalDomain(submittedUrl: string) {
  try { return new URL(submittedUrl).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function normalizeIdentityPart(value: string | null | undefined) {
  return normalizedWords(value ?? "").join("-").slice(0, 160) || "unknown";
}

export function buildResearchQuery(searchName: string, organization: string | null, domain: string) {
  const context = organization?.trim() || domain;
  return `"${searchName}"${context ? ` ${context}` : ""} official eligibility deadline funding requirements application`;
}

export function buildOpportunityIdentityKey(searchName: string, organization: string | null, domain: string) {
  const year = years(searchName)[0] ?? "no-year";
  return `${normalizeIdentityPart(searchName)}|${normalizeIdentityPart(organization || domain)}|${year}`;
}

export function resolveOpportunityIdentity(input: IdentityInput): OpportunityIdentity | null {
  const provided = cleanOpportunityTitle(input.providedName);
  const candidates: Array<{ value: string | null; source: IdentitySource; confidence: IdentityConfidence }> = [
    { value: cleanOpportunityTitle(input.structuredTitle), source: "crawler", confidence: "high" },
    { value: cleanOpportunityTitle(input.openGraphTitle), source: "metadata", confidence: "medium" },
    { value: cleanOpportunityTitle(input.headingTitle), source: "crawler", confidence: "medium" },
    { value: cleanOpportunityTitle(input.prominentTitle), source: "crawler", confidence: "low" },
    { value: cleanOpportunityTitle(input.pageTitle), source: "metadata", confidence: "low" },
  ];
  const detected = candidates.find((candidate) => isMeaningfulOpportunityTitle(candidate.value)) ?? null;
  const chosen = isMeaningfulOpportunityTitle(provided)
    ? { value: provided!, source: "admin" as const, confidence: "high" as const }
    : detected;
  if (!chosen?.value) return null;
  const searchName = chosen.value;
  const domain = originalDomain(input.submittedUrl);
  const organizationHint = input.organization?.trim() || null;
  return {
    searchName,
    source: chosen.source,
    confidence: chosen.confidence,
    detectedName: detected?.value ?? null,
    organizationHint,
    originalDomain: domain,
    searchQuery: buildResearchQuery(searchName, organizationHint, domain),
    cacheKey: buildOpportunityIdentityKey(searchName, organizationHint, domain),
  };
}

function keywordSimilarity(left: string, right: string) {
  const leftWords = new Set(normalizedWords(left).filter((word) => !/^20\d{2}$/.test(word)));
  const rightWords = new Set(normalizedWords(right).filter((word) => !/^20\d{2}$/.test(word)));
  if (!leftWords.size || !rightWords.size) return 0;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / Math.min(leftWords.size, rightWords.size);
}

export function opportunityIdentityMatches(expectedName: string, candidateName: string, expectedOrganization?: string | null, candidateOrganization?: string | null) {
  if (!isMeaningfulOpportunityTitle(candidateName)) return false;
  const expectedYears = years(expectedName);
  const candidateYears = years(candidateName);
  if (expectedYears.length && candidateYears.length && !expectedYears.some((year) => candidateYears.includes(year))) return false;
  const similarity = keywordSimilarity(expectedName, candidateName);
  if (similarity < 0.6) return false;
  if (expectedOrganization && candidateOrganization) {
    const organizationSimilarity = keywordSimilarity(expectedOrganization, candidateOrganization);
    if (organizationSimilarity === 0 && normalizedWords(expectedOrganization).length > 1 && normalizedWords(candidateOrganization).length > 1) return false;
  }
  return true;
}

function hostname(value: string) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function isInstitutionalDomain(domain: string) {
  return INSTITUTIONAL_SUFFIXES.some((suffix) => domain.endsWith(suffix)) || /(^|\.)(un|undp|unicef|worldbank|afdb)\.org$/.test(domain);
}

export function rankResearchSources(identity: OpportunityIdentity, sources: ResearchSource[]) {
  const expectedYears = years(identity.searchName);
  return sources.map<RankedResearchSource>((source) => {
    const domain = hostname(source.url);
    const sourceText = `${source.title} ${source.snippet ?? ""}`;
    const sourceYears = years(sourceText);
    if (expectedYears.length && sourceYears.length && !expectedYears.some((year) => sourceYears.includes(year))) {
      return { ...source, accepted: false, priority: 0, reason: "wrong-year" };
    }
    const aggregator = AGGREGATOR_DOMAINS.some((item) => domain === item || domain.endsWith(`.${item}`));
    const sameDomain = Boolean(identity.originalDomain && (domain === identity.originalDomain || domain.endsWith(`.${identity.originalDomain}`)));
    const titleHasIdentity = isMeaningfulOpportunityTitle(source.title);
    const identityMatch = titleHasIdentity ? opportunityIdentityMatches(identity.searchName, source.title) : false;
    if (titleHasIdentity && !identityMatch && !sameDomain && !isInstitutionalDomain(domain)) {
      return { ...source, accepted: false, priority: 0, reason: "identity-mismatch" };
    }
    const priority = aggregator ? 1 : isInstitutionalDomain(domain) ? 5 : identityMatch ? 4 : sameDomain ? 3 : 2;
    return { ...source, accepted: true, priority, reason: aggregator ? "aggregator" : sameDomain ? "same-domain" : isInstitutionalDomain(domain) ? "institutional" : identityMatch ? "identity-match" : "secondary" };
  }).sort((left, right) => Number(right.accepted) - Number(left.accepted) || right.priority - left.priority);
}

export function hasWrongYear(value: string | null | undefined, expectedName: string) {
  const expectedYears = years(expectedName);
  const valueYears = years(value ?? "");
  return Boolean(expectedYears.length && valueYears.length && !expectedYears.some((year) => valueYears.includes(year)));
}
