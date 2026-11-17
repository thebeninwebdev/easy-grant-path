import "server-only";
import { connection } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/development-user";
import { AppError } from "@/lib/errors";
import { calculateProposalProgress, canCompleteProposal } from "@/lib/proposal-logic";
import { canUseProposalTemplate, chooseFallbackTemplate, isGeneralProposalTemplate } from "@/lib/proposal-creation";
import type { ProposalMetadataInput } from "@/lib/validation/proposal";
import { Opportunity } from "@/models/Opportunity";
import { ProposalApplication } from "@/models/ProposalApplication";
import { ProposalTemplate } from "@/models/ProposalTemplate";
import { UserProfile } from "@/models/UserProfile";
import { buildProposalRecommendation, applyRecommendationSections } from "@/lib/proposal-recommendation";
import { getProposalStarter, getBuiltinTemplateId, PROPOSAL_STARTER_IDS, type ProposalStarterId } from "@/lib/proposal-presets";
import type { ProposalTemplateSectionInput } from "@/lib/validation/proposal";
import { localizeProposalTemplate } from "@/lib/proposal-localization";
import { serializePublicOpportunity } from "@/lib/public-opportunities";
import type { SupportedLocale } from "@/lib/config";


function iso(value: unknown) { if (!value) return null; const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function serializeTemplate(raw: Record<string, unknown>) { const opportunityId = raw.opportunityId ? String(raw.opportunityId) : null; return { id: String(raw._id), opportunityId, scope: raw.scope === "general" || !opportunityId ? "general" as const : "opportunity" as const, title: String(raw.title), description: typeof raw.description === "string" ? raw.description : "", templateType: String(raw.templateType), status: String(raw.status), recommendation: raw.recommendation || null, sections: ((raw.sections as Record<string, unknown>[]) || []).map((section) => ({ key: String(section.key), title: String(section.title), guidance: String(section.guidance), prompt: typeof section.prompt === "string" ? section.prompt : "", example: typeof section.example === "string" ? section.example : "", placeholder: typeof section.placeholder === "string" ? section.placeholder : "", wordLimit: typeof section.wordLimit === "number" ? section.wordLimit : undefined, enabled: section.enabled !== false, required: Boolean(section.required), order: Number(section.order) })).sort((a, b) => a.order - b.order), updatedAt: iso(raw.updatedAt) }; }
export type SerializedProposalTemplate = ReturnType<typeof serializeTemplate>;
function serializeApplication(raw: Record<string, unknown>) { const metadata = (raw.proposalMetadata || {}) as Record<string, unknown>; const fundingOrganization = typeof raw.fundingOrganizationSnapshot === "string" ? raw.fundingOrganizationSnapshot : typeof raw.organizationSnapshot === "string" ? raw.organizationSnapshot : ""; const opportunityId = raw.opportunityId ? String(raw.opportunityId) : null; return { id: String(raw._id), locale: raw.locale === "fr" ? "fr" as const : "en" as const, opportunityId, proposalKind: raw.proposalKind === "general" || !opportunityId ? "general" as const : "opportunity" as const, opportunityTitle: String(raw.opportunityTitleSnapshot), fundingOrganization, organization: fundingOrganization, deadline: iso(raw.deadlineSnapshot), templateTitle: String(raw.templateTitleSnapshot), setupCompleted: raw.setupCompleted !== false, proposalMetadata: { projectTitle: typeof metadata.projectTitle === "string" ? metadata.projectTitle : "", applicantType: typeof metadata.applicantType === "string" ? metadata.applicantType : "", applicantName: typeof metadata.applicantName === "string" ? metadata.applicantName : "", applicantOrganization: typeof metadata.applicantOrganization === "string" ? metadata.applicantOrganization : "", amountRequested: typeof metadata.amountRequested === "number" ? metadata.amountRequested : undefined, currency: typeof metadata.currency === "string" ? metadata.currency : "", projectLocation: typeof metadata.projectLocation === "string" ? metadata.projectLocation : "", projectDuration: typeof metadata.projectDuration === "string" ? metadata.projectDuration : "", contactPerson: typeof metadata.contactPerson === "string" ? metadata.contactPerson : "", contactEmail: typeof metadata.contactEmail === "string" ? metadata.contactEmail : "" }, status: String(raw.status) as "draft" | "completed", progress: Number(raw.progress || 0), sections: ((raw.sections as Record<string, unknown>[]) || []).map((section) => ({ key: String(section.key), title: String(section.title), guidance: String(section.guidanceSnapshot || ""), prompt: String(section.promptSnapshot || ""), example: String(section.exampleSnapshot || ""), placeholder: String(section.placeholderSnapshot || ""), wordLimit: typeof section.wordLimit === "number" ? section.wordLimit : undefined, required: Boolean(section.required), order: Number(section.order), content: String(section.content || "") })).sort((a, b) => a.order - b.order), startedAt: iso(raw.startedAt), completedAt: iso(raw.completedAt), updatedAt: iso(raw.updatedAt) }; }
export type SerializedProposalApplication = ReturnType<typeof serializeApplication>;

async function requireProposalUserId() {
  const userId = await requireCurrentUserId();
  await connectToDatabase();
  if (!await UserProfile.exists({ userId, paid: true })) throw new AppError("Active access is required to use proposal tools.", "FORBIDDEN", 403);
  return userId;
}

const enabledTemplateFilter = { sections: { $elemMatch: { $or: [{ enabled: true }, { enabled: { $exists: false } }] } } };
const publishedTemplateFilter = { status: "published", ...enabledTemplateFilter };
const generalTemplateFilter = { $or: [{ scope: "general" }, { opportunityId: { $exists: false } }] };

function templateCandidate(template: SerializedProposalTemplate) {
  return {
    id: template.id,
    opportunityId: template.opportunityId,
    scope: template.scope,
    templateType: template.templateType,
    status: template.status,
    sectionCount: template.sections.filter((section) => section.enabled).length,
  };
}

function recommendationType(opportunity: Record<string, unknown>) {
  return buildProposalRecommendation({
    title: String(opportunity.title),
    description: String(opportunity.description || ""),
    type: String(opportunity.type),
    sectors: (opportunity.sectors || []) as string[],
  }).recommendedTemplateType;
}

export { createBuiltinProposalTemplate } from "./proposal-resolver";

export async function resolveProposalTemplateForOpportunity(
  opportunity: Record<string, unknown> | { _id?: unknown; id?: string; title: string; [key: string]: unknown },
  locale: SupportedLocale = "en"
): Promise<SerializedProposalTemplate> {
  try {
    await connectToDatabase();
  } catch {
    // In environments without a live database, proceed to built-in fallbacks
  }
  const rawId = opportunity._id || (opportunity as { id?: string }).id;
  const opportunityId = rawId ? String(rawId) : "";

  return resolveGuaranteedProposalTemplate({
    opportunity,
    locale,
    findCustomTemplate: async (id: string) => {
      if (!isValidObjectId(id)) return null;
      return ProposalTemplate.findOne({
        opportunityId: id,
        scope: "opportunity",
        status: "published",
        ...enabledTemplateFilter,
      }).lean();
    },
    findGeneralTemplate: async (templateType: string) => {
      return ProposalTemplate.findOne({
        ...generalTemplateFilter,
        templateType,
        ...publishedTemplateFilter,
      }).sort({ updatedAt: -1 }).lean();
    },
  });
}

function chooseRecommendedTemplate(templates: SerializedProposalTemplate[], opportunityId: string, opportunity: Record<string, unknown>) {
  const selected = chooseFallbackTemplate(templates.map(templateCandidate), opportunityId, recommendationType(opportunity));
  return selected ? templates.find((template) => template.id === selected.id) || null : null;
}

export async function getAdminProposalContext(opportunityId: string) { await connection(); if (!isValidObjectId(opportunityId)) return null; await connectToDatabase(); const [opportunity, template] = await Promise.all([Opportunity.findById(opportunityId).lean(), ProposalTemplate.findOne({ opportunityId }).lean()]); if (!opportunity) return null; const contextOpportunity = { id: String(opportunity._id), title: String(opportunity.title), summary: opportunity.summary || "", description: opportunity.description || "", organization: String(opportunity.agency || opportunity.organization || "Organization not provided"), type: String(opportunity.type), deadline: iso(opportunity.deadline), applicantTypes: opportunity.applicantTypes || [], sectors: opportunity.sectors || [], eligibleCountries: opportunity.eligibleCountries || [], officialUrl: opportunity.officialUrl || null, metadata: (opportunity.metadata || {}) as Record<string, unknown> }; return { opportunity: contextOpportunity, recommendation: buildProposalRecommendation(contextOpportunity), template: template ? serializeTemplate(template as unknown as Record<string, unknown>) : null }; }
export async function getRecommendedTemplateForOpportunity(opportunityId: string, locale: SupportedLocale = "en") {
  await connection();
  if (!isValidObjectId(opportunityId)) return null;
  await connectToDatabase();
  const opportunity = await Opportunity.findById(opportunityId).lean();
  if (!opportunity) return null;
  return resolveProposalTemplateForOpportunity(opportunity as unknown as Record<string, unknown>, locale);
}
export async function getExistingApplicationForOpportunity(opportunityId: string) {
  await connection();
  const userId = await requireProposalUserId();
  const application = await ProposalApplication.findOne({ userId, opportunityId }).select("_id").lean();
  return application ? String(application._id) : null;
}
export async function getProposalCreationOptions(locale: SupportedLocale = "en") {
  await connection();
  const userId = await requireProposalUserId();
  const [opportunities, existing] = await Promise.all([
    Opportunity.find({ verificationStatus: "verified", status: { $in: ["open", "closing_soon", "upcoming"] } })
      .select("title agency organization type sectors description deadline translations metadata").sort({ deadline: 1, title: 1 }).limit(100).lean(),
    ProposalApplication.find({ userId }).select("_id opportunityId proposalTemplateId opportunityTitleSnapshot proposalMetadata updatedAt").sort({ updatedAt: -1 }).lean(),
  ]);
  const opportunityIds = opportunities.map((opportunity) => opportunity._id);
  const rawTemplates = await ProposalTemplate.find({
    $or: [
      { opportunityId: { $in: opportunityIds }, status: "published", ...enabledTemplateFilter },
      { $and: [generalTemplateFilter, publishedTemplateFilter] },
    ],
  }).sort({ updatedAt: -1 }).lean();

  const templatesMap = new Map<string, SerializedProposalTemplate>();
  for (const item of rawTemplates) {
    const serialized = serializeTemplate(item as unknown as Record<string, unknown>);
    if (serialized.sections.filter((s) => s.enabled).length >= 1) {
      templatesMap.set(serialized.id, localizeProposalTemplate(serialized, locale));
    }
  }

  // Ensure universal built-in template is available
  const universalBuiltin = createBuiltinProposalTemplate("general", locale, { universalFallback: true });
  if (!templatesMap.has(universalBuiltin.id)) {
    templatesMap.set(universalBuiltin.id, universalBuiltin);
  }

  const existingByOpportunity = new Map(existing.filter((item) => item.opportunityId).map((item) => [String(item.opportunityId), String(item._id)]));

  const resolvedOpportunities = await Promise.all(
    opportunities.map(async (opportunity) => {
      const id = String(opportunity._id);
      const localized = serializePublicOpportunity(opportunity as unknown as Record<string, unknown>, locale);
      const recommendedType = recommendationType(opportunity as unknown as Record<string, unknown>);
      
      const resolved = await resolveProposalTemplateForOpportunity(opportunity as unknown as Record<string, unknown>, locale);
      if (!templatesMap.has(resolved.id)) {
        templatesMap.set(resolved.id, resolved);
      }

      return {
        id,
        title: localized.title,
        organization: String(localized.agency || localized.organization || (locale === "fr" ? "Organisation non fournie" : "Organization not provided")),
        type: String(opportunity.type),
        deadline: iso(opportunity.deadline),
        recommendedTemplateType: recommendedType,
        recommendedTemplateId: resolved.id,
        applicableTemplateIds: [resolved.id],
        existingApplicationId: existingByOpportunity.get(id) || null,
      };
    })
  );

  const allTemplates = Array.from(templatesMap.values());
  const generalTemplates = allTemplates
    .filter((template) => template.status === "published" && isGeneralProposalTemplate(template))
    .map((template) => template.id);

  return {
    templates: allTemplates.map((template) => ({
      id: template.id,
      opportunityId: template.opportunityId,
      scope: template.scope,
      title: template.title,
      description: template.description,
      templateType: template.templateType,
      sections: template.sections.filter((section) => section.enabled).map((section) => ({
        key: section.key,
        title: section.title,
        required: section.required,
        wordLimit: section.wordLimit,
      })),
    })),
    opportunities: resolvedOpportunities,
    generalTemplates: generalTemplates.length ? generalTemplates : [universalBuiltin.id],
    recentGeneralProposals: existing.filter((item) => !item.opportunityId).slice(0, 5).map((item) => {
      const metadata = (item.proposalMetadata || {}) as { projectTitle?: string };
      return { id: String(item._id), title: metadata.projectTitle || String(item.opportunityTitleSnapshot), updatedAt: iso(item.updatedAt) };
    }),
  };
}
export type ProposalCreationOptions = Awaited<ReturnType<typeof getProposalCreationOptions>>;
export type StartProposalInput = { opportunityId?: string; templateId?: string; locale?: SupportedLocale };
export async function startProposal(input: StartProposalInput) {
  const { opportunityId, templateId, locale = "en" } = input;
  if (opportunityId && !isValidObjectId(opportunityId)) throw new AppError("Invalid opportunity ID.", "VALIDATION_ERROR", 400);
  if (templateId && !isValidObjectId(templateId)) throw new AppError("Invalid proposal template ID.", "VALIDATION_ERROR", 400);
  const userId = await requireProposalUserId();
  if (opportunityId) {
    const existing = await ProposalApplication.findOne({ userId, opportunityId }).lean();
    if (existing) return serializeApplication(existing as unknown as Record<string, unknown>);
  }
  const opportunity = opportunityId
    ? await Opportunity.findOne({ _id: opportunityId, verificationStatus: "verified", status: { $in: ["open", "closing_soon", "upcoming"] } }).lean()
    : null;
  if (opportunityId && !opportunity) throw new AppError("Opportunity not found or unavailable.", "NOT_FOUND", 404);

  let template: SerializedProposalTemplate | null = null;
  if (opportunityId && opportunity) {
    template = await resolveProposalTemplateForOpportunity(opportunity as unknown as Record<string, unknown>, locale);
  } else if (templateId) {
    const rawTemplate = await ProposalTemplate.findOne({ _id: templateId, ...publishedTemplateFilter }).lean();
    if (rawTemplate) {
      template = localizeProposalTemplate(serializeTemplate(rawTemplate as unknown as Record<string, unknown>), locale);
    } else {
      for (const starterId of PROPOSAL_STARTER_IDS) {
        if (getBuiltinTemplateId(starterId) === templateId) {
          template = createBuiltinProposalTemplate(starterId, locale);
          break;
        }
      }
    }
  }

  if (!template) {
    template = createBuiltinProposalTemplate("general", locale, { universalFallback: true });
  }

  const serializedTemplate = template;
  const candidate = templateCandidate(serializedTemplate);
  if (!canUseProposalTemplate(candidate, opportunityId)) throw new AppError("This template cannot be used for the selected proposal.", "FORBIDDEN", 403);

  const templateSections = serializedTemplate.sections.filter((section) => section.enabled !== false).slice().sort((a, b) => a.order - b.order);
  const localizedOpportunity = opportunity ? serializePublicOpportunity(opportunity as unknown as Record<string, unknown>, locale) : null;
  const fundingOrganization = localizedOpportunity ? localizedOpportunity.agency || localizedOpportunity.organization || "" : "";
  const applicationData = {
    userId,
    locale,
    ...(opportunityId ? { opportunityId } : {}),
    proposalKind: opportunityId ? "opportunity" : "general",
    proposalTemplateId: serializedTemplate.id,
    opportunityTitleSnapshot: localizedOpportunity ? localizedOpportunity.title : locale === "fr" ? "Proposition de financement générale" : "General funding proposal",
    organizationSnapshot: fundingOrganization,
    fundingOrganizationSnapshot: fundingOrganization,
    deadlineSnapshot: opportunity?.deadline,
    templateTitleSnapshot: serializedTemplate.title,
    setupCompleted: false,
    sections: templateSections.map((section) => ({ key: section.key, title: section.title, guidanceSnapshot: section.guidance, promptSnapshot: section.prompt, exampleSnapshot: section.example, placeholderSnapshot: section.placeholder, wordLimit: section.wordLimit, required: section.required, order: section.order, content: "" })),
    progress: 0,
  };
  try {
    const application = await ProposalApplication.create(applicationData);
    return serializeApplication(application.toObject() as unknown as Record<string, unknown>);
  } catch (error) {
    if (opportunityId && typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000) {
      const raced = await ProposalApplication.findOne({ userId, opportunityId }).lean();
      if (raced) return serializeApplication(raced as unknown as Record<string, unknown>);
    }
    throw error;
  }
}
export async function getProposalApplication(id: string) { await connection(); if (!isValidObjectId(id)) return null; await connectToDatabase(); const application = await ProposalApplication.findOne({ _id: id, userId: await requireProposalUserId() }).lean(); return application ? serializeApplication(application as unknown as Record<string, unknown>) : null; }
export async function listProposalApplications() { await connection(); await connectToDatabase(); const items = await ProposalApplication.find({ userId: await requireProposalUserId() }).sort({ updatedAt: -1 }).lean(); return items.map((item) => serializeApplication(item as unknown as Record<string, unknown>)); }
export async function updateProposalSection(id: string, sectionKey: string, content: string) { if (!isValidObjectId(id)) throw new AppError("Invalid proposal ID.", "VALIDATION_ERROR", 400); await connectToDatabase(); const application = await ProposalApplication.findOne({ _id: id, userId: await requireProposalUserId() }); if (!application) throw new AppError("Proposal not found.", "NOT_FOUND", 404); const section = application.sections.find((item: { key: string }) => item.key === sectionKey); if (!section) throw new AppError("Proposal section not found.", "NOT_FOUND", 404); section.content = content; application.progress = calculateProposalProgress(application.sections); await application.save(); return serializeApplication(application.toObject() as unknown as Record<string, unknown>); }
export async function updateProposalMetadata(id: string, metadata: ProposalMetadataInput) { if (!isValidObjectId(id)) throw new AppError("Invalid proposal ID.", "VALIDATION_ERROR", 400); await connectToDatabase(); const application = await ProposalApplication.findOne({ _id: id, userId: await requireProposalUserId() }); if (!application) throw new AppError("Proposal not found.", "NOT_FOUND", 404); application.proposalMetadata = metadata; application.setupCompleted = true; await application.save(); return serializeApplication(application.toObject() as unknown as Record<string, unknown>); }
export async function completeProposal(id: string) { if (!isValidObjectId(id)) throw new AppError("Invalid proposal ID.", "VALIDATION_ERROR", 400); await connectToDatabase(); const application = await ProposalApplication.findOne({ _id: id, userId: await requireProposalUserId() }); if (!application) throw new AppError("Proposal not found.", "NOT_FOUND", 404); if (!canCompleteProposal(application.sections)) throw new AppError("Complete every required section first.", "INCOMPLETE_PROPOSAL", 409); application.status = "completed"; application.progress = 100; application.completedAt = new Date(); await application.save(); return serializeApplication(application.toObject() as unknown as Record<string, unknown>); }
