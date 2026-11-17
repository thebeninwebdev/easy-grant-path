import { PROPOSAL_STARTERS, getProposalStarter, getBuiltinTemplateId, normalizeProposalStarterId, type ProposalStarterId } from "./proposal-presets.ts";
import { buildProposalRecommendation, applyRecommendationSections } from "./proposal-recommendation.ts";
import { localizeProposalTemplate } from "./proposal-localization.ts";
import type { SupportedLocale } from "./config.ts";

export type ResolvedProposalSection = {
  key: string;
  title: string;
  guidance: string;
  prompt: string;
  example: string;
  placeholder: string;
  wordLimit?: number;
  enabled: boolean;
  required: boolean;
  order: number;
};

export type ResolvedProposalTemplate = {
  id: string;
  opportunityId: string | null;
  scope: "general" | "opportunity";
  title: string;
  description: string;
  templateType: string;
  status: string;
  recommendation?: {
    source: string;
    confidence: string;
    reasons: string[];
  } | null;
  sections: ResolvedProposalSection[];
  updatedAt: string | null;
};

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeRawTemplate(raw: Record<string, unknown>): ResolvedProposalTemplate {
  const opportunityId = raw.opportunityId ? String(raw.opportunityId) : null;
  return {
    id: String(raw._id || raw.id || ""),
    opportunityId,
    scope: raw.scope === "general" || !opportunityId ? ("general" as const) : ("opportunity" as const),
    title: String(raw.title || ""),
    description: typeof raw.description === "string" ? raw.description : "",
    templateType: String(raw.templateType || "general"),
    status: String(raw.status || "draft"),
    recommendation: (raw.recommendation as ResolvedProposalTemplate["recommendation"]) || null,
    sections: ((raw.sections as Record<string, unknown>[]) || [])
      .map((section) => ({
        key: String(section.key || ""),
        title: String(section.title || ""),
        guidance: String(section.guidance || ""),
        prompt: typeof section.prompt === "string" ? section.prompt : "",
        example: typeof section.example === "string" ? section.example : "",
        placeholder: typeof section.placeholder === "string" ? section.placeholder : "",
        wordLimit: typeof section.wordLimit === "number" ? section.wordLimit : undefined,
        enabled: section.enabled !== false,
        required: Boolean(section.required),
        order: Number(section.order || 0),
      }))
      .sort((a, b) => a.order - b.order),
    updatedAt: iso(raw.updatedAt),
  };
}

export function isUsableCustomTemplate(raw: Record<string, unknown> | null | undefined): boolean {
  if (!raw || typeof raw !== "object") return false;
  if (raw.status !== "published") return false;
  if (!Array.isArray(raw.sections)) return false;
  const enabledSections = raw.sections.filter(
    (s) => s && typeof s === "object" && (s as Record<string, unknown>).enabled !== false
  );
  return enabledSections.length >= 1;
}

export function createBuiltinProposalTemplate(
  starterId: ProposalStarterId | string,
  locale: SupportedLocale = "en",
  options?: {
    isUniversal?: boolean;
    sections?: Array<{
      key: string;
      title: string;
      guidance: string;
      prompt?: string;
      example?: string;
      placeholder?: string;
      wordLimit?: number;
      enabled?: boolean;
      required?: boolean;
      order?: number;
    }>;
  }
): ResolvedProposalTemplate {
  const normalizedId = normalizeProposalStarterId(starterId);
  const starter = getProposalStarter(normalizedId);
  const isUniversal = Boolean(options?.isUniversal);
  const sectionsSource = options?.sections || starter.sections;

  const rawTemplate: ResolvedProposalTemplate = {
    id: getBuiltinTemplateId(isUniversal ? "universal" : starter.id),
    opportunityId: null,
    scope: "general",
    title: starter.name,
    description: isUniversal
      ? "Standard, comprehensive proposal structure suitable for grant applications."
      : starter.description,
    templateType: starter.id,
    status: "published",
    recommendation: {
      source: "automatic",
      confidence: isUniversal ? "medium" : "high",
      reasons: ["Built-in trusted proposal template"],
    },
    sections: sectionsSource.map((section, index) => ({
      key: String(section.key),
      title: String(section.title),
      guidance: String(section.guidance),
      prompt: typeof section.prompt === "string" ? section.prompt : "",
      example: typeof section.example === "string" ? section.example : "",
      placeholder: typeof section.placeholder === "string" ? section.placeholder : "",
      wordLimit: typeof section.wordLimit === "number" ? section.wordLimit : undefined,
      enabled: section.enabled !== false,
      required: Boolean(section.required),
      order: typeof section.order === "number" ? section.order : index,
    })),
    updatedAt: new Date(0).toISOString(),
  };

  const localized = localizeProposalTemplate(rawTemplate, locale);
  if (isUniversal) {
    localized.title =
      locale === "fr" ? "Structure de proposition recommandée" : "Recommended proposal structure";
    localized.description =
      locale === "fr"
        ? "Structure de proposition standard et complète adaptée aux demandes de subvention."
        : "Standard, comprehensive proposal structure suitable for grant applications.";
  }
  return localized;
}

export interface ResolveTemplateContext {
  opportunity: Record<string, unknown> | { _id?: unknown; id?: string; title: string; [key: string]: unknown };
  locale?: SupportedLocale;
  findCustomTemplate?: (opportunityId: string) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;
  findGeneralTemplate?: (templateType: string) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;
}

export async function resolveGuaranteedProposalTemplate(
  context: ResolveTemplateContext
): Promise<ResolvedProposalTemplate> {
  const { opportunity, locale = "en", findCustomTemplate, findGeneralTemplate } = context;
  const rawId = opportunity._id || (opportunity as { id?: string }).id;
  const opportunityId = rawId ? String(rawId) : "";

  // Priority 1 — Approved custom template:
  // If the opportunity has an explicitly assigned, valid, approved and published custom template, use it.
  if (opportunityId && findCustomTemplate) {
    try {
      const customDoc = await findCustomTemplate(opportunityId);
      if (customDoc && isUsableCustomTemplate(customDoc)) {
        const serialized = serializeRawTemplate(customDoc);
        return localizeProposalTemplate(serialized, locale);
      }
    } catch {
      // Fall through to system-recommended template
    }
  }

  // Priority 2 — System-recommended template:
  // Automatically select the most appropriate built-in recommended template based on opportunity's attributes.
  const recommendation = buildProposalRecommendation({
    title: String(opportunity.title || ""),
    summary: typeof opportunity.summary === "string" ? opportunity.summary : null,
    description: typeof opportunity.description === "string" ? opportunity.description : null,
    type: typeof opportunity.type === "string" ? opportunity.type : undefined,
    sectors: Array.isArray(opportunity.sectors) ? (opportunity.sectors as string[]) : [],
    applicantTypes: Array.isArray(opportunity.applicantTypes) ? (opportunity.applicantTypes as string[]) : [],
    organization: typeof opportunity.organization === "string" ? opportunity.organization : null,
    agency: typeof opportunity.agency === "string" ? opportunity.agency : null,
    metadata: (opportunity.metadata || {}) as Record<string, unknown>,
  });

  const recommendedType = recommendation.recommendedTemplateType;

  if (recommendedType && recommendedType !== "general") {
    // If an administrator published a general template in MongoDB matching this category, check it
    if (findGeneralTemplate) {
      try {
        const generalDoc = await findGeneralTemplate(recommendedType);
        if (generalDoc && isUsableCustomTemplate(generalDoc)) {
          const serialized = serializeRawTemplate(generalDoc);
          return localizeProposalTemplate(serialized, locale);
        }
      } catch {
        // Fall through to built-in template preset
      }
    }

    const starter = getProposalStarter(recommendedType as ProposalStarterId);
    if (starter) {
      const tailoredSections = applyRecommendationSections(recommendation);
      return createBuiltinProposalTemplate(recommendedType as ProposalStarterId, locale, {
        sections: tailoredSections,
      });
    }
  }

  // If a general MongoDB template is published, check it
  if (findGeneralTemplate) {
    try {
      const dbGeneral = await findGeneralTemplate("general");
      if (dbGeneral && isUsableCustomTemplate(dbGeneral)) {
        const serialized = serializeRawTemplate(dbGeneral);
        return localizeProposalTemplate(serialized, locale);
      }
    } catch {
      // Fall through to universal default
    }
  }

  // Priority 3 — Universal default proposal template:
  // Built-in general proposal starter with 12 standard sections, clearly labeled
  return createBuiltinProposalTemplate("general", locale, { isUniversal: true });
}
