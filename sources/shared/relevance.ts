import type { EligibilityAssessment, NormalizedOpportunity, OpportunityType, RelevanceResult } from "@/types/opportunities";

const COUNTRY_ALIASES = [
  { name: "Côte d’Ivoire", aliases: ["côte d'ivoire", "côte d’ivoire", "cote d'ivoire", "cote d ivoire", "ivory coast"] },
  { name: "Nigeria", aliases: ["nigeria"] }, { name: "Ghana", aliases: ["ghana"] },
  { name: "Senegal", aliases: ["senegal", "sénégal"] }, { name: "Benin", aliases: ["benin", "bénin"] },
  { name: "Togo", aliases: ["togo"] }, { name: "Mali", aliases: ["mali"] },
  { name: "Burkina Faso", aliases: ["burkina faso"] }, { name: "Guinea", aliases: ["guinea", "guinée"] },
  { name: "Liberia", aliases: ["liberia", "libéria"] }, { name: "Sierra Leone", aliases: ["sierra leone"] },
  { name: "Gambia", aliases: ["gambia", "the gambia", "gambie"] },
  { name: "Guinea-Bissau", aliases: ["guinea bissau", "guinée-bissau", "guinee bissau"] },
  { name: "Niger", aliases: ["niger"] }, { name: "Cabo Verde", aliases: ["cabo verde", "cape verde", "cap vert", "cap-vert"] },
] as const;
const REGION_TERMS = ["west africa", "afrique de l'ouest", "afrique de l ouest", "ecowas", "cedeao", "cédéao"];
const AFRICA_TERMS = ["africa", "afrique", "sub saharan africa", "afrique subsaharienne", "francophone africa", "afrique francophone"];
const GLOBAL_TERMS = ["worldwide", "global", "all countries", "any country", "international applicants", "international organizations", "foreign organizations", "foreign entities"];
const ELIGIBILITY_TERMS = ["eligible", "eligibility", "open to", "applications from", "applicants from", "organizations from", "organisations from", "based in", "located in", "citizens of", "residents of", "countries eligible", "pays eligibles", "ouvert a", "ouverte a", "candidats de", "organisations de"];
const EXCLUDED_NOTICE = /\b(?:procurement|tenders?|request for bids?|invitation to bids?|request for quotations?|consultants?|consultancy|recruitment|job vacancies?|employment opportunities?|marches? publics?|appel d offres?|avis d appel d offres)\b/;
const FUNDING_SIGNAL = /\b(?:call for proposals?|call for applications?|funding (?:call|opportunit(?:y|ies)|programme|program)|grant(?:s| notice| programme| program| opportunity| call)?|subventions?|financements?|appel a propositions?|appel a candidatures?|fellowships?|scholarships?|bourses?|research support|startup funding|sme funding|seed funding|financial support)\b/;
const STRONG_CALL_SIGNAL = /\b(?:call for proposals?|call for applications?|funding (?:call|opportunit(?:y|ies)|programme|program)|grant (?:notice|programme|program|opportunity|call)|subventions?|financements?|appel a propositions?|appel a candidatures?|fellowships?|scholarships?|bourses?|research support|startup funding|sme funding|seed funding|financial support)\b/;
const APPLICATION_SIGNAL = /\b(?:apply|applications?|applicants?|eligible|eligibility|deadline|date limite|open call|now open|submission)\b/;
const FINANCIAL_SUPPORT = /\b(?:grant|grants|funding|funded|financement|subvention|financial support|cash prize|monetary prize|award of|stipend|allocation|bourse|scholarship|fellowship|seed capital|investment)\b/;
const COMPETITION_SIGNAL = /\b(?:competition|challenge|prize|award|concours|prix)\b/;
const PROGRAMME_SIGNAL = /\b(?:accelerator|acceleration programme|acceleration program|capacity building|training programme|training program|entrepreneurship programme|entrepreneurship program|programme d accompagnement)\b/;

export function normalizeMatchingText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘`´]/g, "'").replace(/[‐‑‒–—]/g, "-").toLowerCase().replace(/[^a-z0-9'$€£]+/g, " ").replace(/\s+/g, " ").trim();
}
function containsTerm(text: string, term: string) { return (` ${text} `).includes(` ${normalizeMatchingText(term)} `); }
function containsAny(text: string, terms: readonly string[]) { return terms.some((term) => containsTerm(text, term)); }
export function findMentionedCountries(value: string) {
  const text = normalizeMatchingText(value);
  return COUNTRY_ALIASES.filter((country) => country.aliases.some((alias) => containsTerm(text, alias))).map((country) => country.name);
}
function hasEligibilityContext(text: string, terms: readonly string[]) {
  const padded = ` ${text} `;
  for (const term of terms) {
    const needle = ` ${normalizeMatchingText(term)} `; let index = padded.indexOf(needle);
    while (index >= 0) {
      const context = padded.slice(Math.max(0, index - 100), Math.min(padded.length, index + needle.length + 100));
      if (ELIGIBILITY_TERMS.some((eligibility) => context.includes(normalizeMatchingText(eligibility)))) return true;
      index = padded.indexOf(needle, index + needle.length);
    }
  }
  return false;
}
export function findExplicitEligibleLocations(value: string) {
  const text = normalizeMatchingText(value);
  const locations: string[] = COUNTRY_ALIASES.filter((country) => hasEligibilityContext(text, country.aliases)).map((country) => country.name);
  if (hasEligibilityContext(text, REGION_TERMS)) locations.push("West Africa");
  if (hasEligibilityContext(text, AFRICA_TERMS)) locations.push("Africa");
  if (hasEligibilityContext(text, GLOBAL_TERMS) || /\b(?:open worldwide|open globally|applicants from all countries|applicants from any country)\b/.test(text)) locations.push("Global");
  return [...new Set(locations)];
}
function explicitIneligibility(text: string) {
  const rules: Array<[RegExp, string]> = [
    [/\b(?:u s|us|united states|american) (?:citizens?|residents?|organizations?|organisations?|entities|applicants?) only\b|\bonly (?:u s|us|united states|american) (?:citizens?|residents?|organizations?|organisations?|entities|applicants?)\b|\blimited to (?:u s|us|united states|american) (?:citizens?|residents?|organizations?|organisations?|entities|applicants?)\b|\bonly (?:organizations?|organisations?|entities|applicants?) (?:based|located|established) in (?:the )?(?:u s|us|united states)\b|\bdomestic applicants only\b/, "Eligibility is explicitly limited to U.S. applicants"],
    [/\b(?:eu|european union) (?:citizens?|residents?|organizations?|organisations?|entities|applicants?|member states?) only\b|\bonly (?:eu|european union) (?:citizens?|residents?|organizations?|organisations?|entities|applicants?|member states?)\b|\blimited to (?:eu|european union) (?:citizens?|residents?|organizations?|organisations?|entities|applicants?|member states?)\b|\b(?:only|limited to) (?:organizations?|organisations?|applicants?) (?:based|located|established) in (?:the )?(?:eu|european union)\b/, "Eligibility is explicitly limited to European Union applicants"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1];
}
function result(classification: RelevanceResult["classification"], confidence: RelevanceResult["confidence"], eligibility: EligibilityAssessment, score: number, reasons: string[]): RelevanceResult {
  return { relevant: classification !== "irrelevant", classification, confidence, eligibility, score, reasons };
}
export function assessOpportunityRelevance(opportunity: NormalizedOpportunity, options: { defaultPotential?: boolean } = {}): RelevanceResult {
  const narrative = normalizeMatchingText([opportunity.title, opportunity.summary, opportunity.description].filter(Boolean).join(" "));
  const structured = normalizeMatchingText([...(opportunity.eligibleCountries ?? []), ...(opportunity.applicantTypes ?? [])].join(" "));
  const combined = `${structured} ${narrative}`.trim();
  const exclusion = explicitIneligibility(combined);
  if (exclusion) return result("irrelevant", "high", "explicitly_ineligible", 0, [exclusion]);

  const structuredCountries = findMentionedCountries(structured);
  if (structuredCountries.length) return result("relevant", "high", "explicit_country", 95, [`Structured eligibility includes ${structuredCountries.join(", ")}`]);
  if (containsAny(structured, REGION_TERMS)) return result("relevant", "high", "west_africa", 92, ["Structured eligibility includes West Africa or ECOWAS"]);
  if (containsAny(structured, AFRICA_TERMS)) return result("relevant", "high", "africa", 88, ["Structured eligibility includes African applicants"]);
  if (containsAny(structured, GLOBAL_TERMS)) return result("relevant", "high", "worldwide", 85, ["Structured eligibility includes international or worldwide applicants"]);

  const explicitLocations = findExplicitEligibleLocations(narrative);
  const explicitCountries = explicitLocations.filter((location) => !["West Africa", "Africa", "Global"].includes(location));
  if (explicitCountries.length) return result("relevant", "high", "explicit_country", 90, [`Eligibility language includes ${explicitCountries.join(", ")}`]);
  if (explicitLocations.includes("West Africa")) return result("relevant", "high", "west_africa", 86, ["Eligibility language includes West African or ECOWAS applicants"]);
  if (explicitLocations.includes("Africa")) return result("relevant", "medium", "africa", 78, ["Eligibility language includes African applicants"]);
  if (explicitLocations.includes("Global")) return result("relevant", "medium", "worldwide", 76, ["Eligibility language includes worldwide or international applicants"]);

  const mentioned = findMentionedCountries(narrative);
  if (mentioned.length) return result("potentially_relevant", "low", "uncertain", 52, [`Target location mentioned without clear applicant eligibility: ${mentioned.join(", ")}`]);
  if (containsAny(narrative, REGION_TERMS)) return result("potentially_relevant", "medium", "uncertain", 55, ["West African or ECOWAS scope is stated, but applicant eligibility requires review"]);
  if (containsAny(narrative, AFRICA_TERMS)) return result("potentially_relevant", "medium", "uncertain", 50, ["African scope is stated, but applicant eligibility requires review"]);
  if (containsAny(narrative, GLOBAL_TERMS)) return result("potentially_relevant", "low", "uncertain", 46, ["International scope is stated, but applicant eligibility requires review"]);
  if (options.defaultPotential) return result("potentially_relevant", "low", "uncertain", 35, ["Credible official funding call; geographic eligibility requires manual verification"]);
  return result("irrelevant", "medium", "no_target_evidence", 0, ["No evidence that applicants from the target region are eligible"]);
}
export function detectOpportunityType(value: string): OpportunityType | undefined {
  const text = normalizeMatchingText(value);
  if (EXCLUDED_NOTICE.test(text)) return undefined;
  if (/\b(?:scholarship|bourse d etudes?|bourses d etudes?)\b/.test(text)) return "scholarship";
  if (/\b(?:fellowship|research fellowship)\b/.test(text)) return "fellowship";
  if (/\b(?:startup|start up|sme|pme|small and medium|entrepreneur)\b/.test(text) && FINANCIAL_SUPPORT.test(text)) return "startup_funding";
  if (/\b(?:accelerator|acceleration programme|acceleration program)\b/.test(text) && FINANCIAL_SUPPORT.test(text)) return "accelerator";
  if (COMPETITION_SIGNAL.test(text) && FINANCIAL_SUPPORT.test(text)) return "competition";
  if (/\b(?:research grant|research support|research funding)\b/.test(text)) return "research_support";
  if (FUNDING_SIGNAL.test(text)) return "grant";
  return undefined;
}
export function isFundingOpportunity(value: string) {
  const text = normalizeMatchingText(value);
  if (!text || EXCLUDED_NOTICE.test(text)) return false;
  if (STRONG_CALL_SIGNAL.test(text)) return true;
  if (/\bgrants?\b/.test(text) && APPLICATION_SIGNAL.test(text)) return true;
  return (COMPETITION_SIGNAL.test(text) || PROGRAMME_SIGNAL.test(text)) && FINANCIAL_SUPPORT.test(text);
}
