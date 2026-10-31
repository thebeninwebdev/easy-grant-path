import { getProposalPreset, getProposalStarter, normalizeProposalStarterId, type ProposalStarterId } from "./proposal-presets.ts";

export type RecommendationConfidence = "low" | "medium" | "high";
export interface RecommendationOpportunity {
  title: string; summary?: string | null; description?: string | null; type?: string;
  sectors?: string[]; applicantTypes?: string[]; organization?: string | null; agency?: string | null;
  metadata?: Record<string, unknown> | null;
}
export interface RecommendedSection { key: string; enabled: boolean; required: boolean; reason: string }
export interface ProposalRecommendation {
  recommendedTemplateType: ProposalStarterId; confidence: RecommendationConfidence; reasons: string[]; sections: RecommendedSection[];
}

const groups: Array<{ id: ProposalStarterId; terms: string[]; reason: string }> = [
  { id: "scholarship_study", terms: ["scholarship", "tuition", "academic program", "study grant", "student funding"], reason: "Scholarship and study funding language detected" },
  { id: "fellowship_leadership", terms: ["fellowship", "leadership program", "professional development cohort"], reason: "Fellowship or leadership development language detected" },
  { id: "research_academic", terms: ["research questions", "methodology", "data collection", "ethics approval", "literature review", "data analysis", "study design"], reason: "Research terminology detected" },
  { id: "startup_sme", terms: ["startup", "market size", "customers", "revenue model", "commercialization", "business model", "go-to-market", "traction"], reason: "Startup and commercial growth language detected" },
  { id: "youth_employment_skills", terms: ["youth", "young people", "digital skills", "vocational training", "employment program", "job placement", "employability"], reason: "Youth skills and employment language detected" },
  { id: "women_girls_empowerment", terms: ["women", "girls", "gender equality", "women's participation", "gender-based"], reason: "Women and girls focus detected" },
  { id: "agriculture_food_security", terms: ["agriculture", "farmer", "food security", "livelihoods", "crop", "market access"], reason: "Agriculture and food-security focus detected" },
  { id: "climate_environment", terms: ["climate", "environment", "resilience", "biodiversity", "conservation", "emissions"], reason: "Climate or environmental focus detected" },
  { id: "education", terms: ["education", "learning outcomes", "teacher", "school", "classroom"], reason: "Education focus detected" },
  { id: "health_public_health", terms: ["health", "public health", "clinic", "patients", "maternal", "disease prevention"], reason: "Health focus detected" },
  { id: "ngo_community_development", terms: ["community development", "nonprofit", "non-profit", "civil society", "community beneficiaries", "community-led"], reason: "Community development or nonprofit language detected" },
];

const sectionSignals: Array<{ keys: string[]; terms: string[]; reason: string; required?: boolean }> = [
  { keys: ["sustainability", "post-fellowship-plan"], terms: ["sustainability", "continuation plan", "long-term viability", "after the grant"], reason: "Opportunity mentions continuation or long-term viability", required: false },
  { keys: ["risk-management", "key-risks", "risks-limitations"], terms: ["risk assessment", "risk mitigation", "risks and assumptions", "risk management"], reason: "Opportunity requests risk planning" },
  { keys: ["inclusion-safeguarding", "safeguarding"], terms: ["safeguarding", "child protection", "protection policy"], reason: "Opportunity includes safeguarding requirements" },
  { keys: ["monitoring-evaluation"], terms: ["monitoring", "evaluation", "indicators", "m&e", "results framework"], reason: "Opportunity requests monitoring and evaluation", required: true },
  { keys: ["implementation-plan", "timeline"], terms: ["work plan", "timeline", "implementation schedule"], reason: "Opportunity requests a work plan or timeline" },
  { keys: ["budget-narrative", "budget-justification"], terms: ["budget narrative", "budget justification", "use of funds"], reason: "Opportunity requests a budget explanation" },
  { keys: ["partnerships"], terms: ["partnerships", "consortium", "collaborators"], reason: "Opportunity mentions partners or collaborators" },
  { keys: ["job-creation", "employer-partnerships"], terms: ["job placement", "employer", "employment outcomes", "jobs created"], reason: "Opportunity emphasizes employment or placement" },
];

function hasTerm(text: string, term: string) { return text.includes(term) || (term.endsWith("s") && text.includes(term.slice(0, -1))); }

export function buildProposalRecommendation(opportunity: RecommendationOpportunity): ProposalRecommendation {
  const text = [opportunity.title, opportunity.summary, opportunity.description, opportunity.organization, opportunity.agency, ...(opportunity.sectors || []), ...(opportunity.applicantTypes || []), JSON.stringify(opportunity.metadata || {})].filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9&' -]/g, " ").replace(/\s+/g, " ");
  const scored = groups.map((group) => ({ ...group, score: group.terms.filter((term) => hasTerm(text, term)).length })).filter((group) => group.score > 0).sort((a, b) => b.score - a.score);
  const explicitType: Partial<Record<string, ProposalStarterId>> = { startup_funding: "startup_sme", accelerator: "startup_sme", research_support: "research_academic", scholarship: "scholarship_study", fellowship: "fellowship_leadership" };
  const selected = explicitType[opportunity.type || ""] || scored[0]?.id || "general";
  const starter = getProposalStarter(normalizeProposalStarterId(selected));
  const reasons = scored.slice(0, 3).map((item) => item.reason);
  if (!reasons.length) reasons.push("No strong specialized signals detected; General Grant is the safest starting structure");
  const confidence: RecommendationConfidence = selected === "general" ? "low" : (scored[0]?.score || 0) >= 2 || explicitType[opportunity.type || ""] ? "high" : "medium";
  const sections = getProposalPreset(starter.id).map((section) => ({ key: section.key, enabled: section.enabled !== false, required: Boolean(section.required), reason: "Core section from the recommended proposal family" }));
  for (const signal of sectionSignals) {
    if (!signal.terms.some((term) => hasTerm(text, term))) continue;
    for (const section of sections) if (signal.keys.includes(section.key)) { section.enabled = true; if (signal.required !== undefined) section.required = signal.required; section.reason = signal.reason; }
    reasons.push(signal.reason);
  }
  return { recommendedTemplateType: starter.id, confidence, reasons: [...new Set(reasons)], sections };
}

export function applyRecommendationSections(recommendation: ProposalRecommendation) {
  const preset = getProposalPreset(recommendation.recommendedTemplateType);
  return preset.map((section) => { const match = recommendation.sections.find((item) => item.key === section.key); return { ...section, enabled: match?.enabled ?? true, required: match?.required ?? section.required }; });
}
