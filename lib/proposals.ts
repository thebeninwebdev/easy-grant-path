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
import { buildProposalRecommendation } from "@/lib/proposal-recommendation";

type TemplateSection = { key: string; title: string; guidance: string; prompt?: string; example?: string; placeholder?: string; wordLimit?: number; enabled?: boolean; required: boolean; order: number };

function iso(value: unknown) { if (!value) return null; const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function serializeTemplate(raw: Record<string, unknown>) { const opportunityId = raw.opportunityId ? String(raw.opportunityId) : null; return { id: String(raw._id), opportunityId, scope: raw.scope === "general" || !opportunityId ? "general" as const : "opportunity" as const, title: String(raw.title), description: typeof raw.description === "string" ? raw.description : "", templateType: String(raw.templateType), status: String(raw.status), recommendation: raw.recommendation || null, sections: ((raw.sections as Record<string, unknown>[]) || []).map((section) => ({ key: String(section.key), title: String(section.title), guidance: String(section.guidance), prompt: typeof section.prompt === "string" ? section.prompt : "", example: typeof section.example === "string" ? section.example : "", placeholder: typeof section.placeholder === "string" ? section.placeholder : "", wordLimit: typeof section.wordLimit === "number" ? section.wordLimit : undefined, enabled: section.enabled !== false, required: Boolean(section.required), order: Number(section.order) })).sort((a, b) => a.order - b.order), updatedAt: iso(raw.updatedAt) }; }
export type SerializedProposalTemplate = ReturnType<typeof serializeTemplate>;
function serializeApplication(raw: Record<string, unknown>) { const metadata = (raw.proposalMetadata || {}) as Record<string, unknown>; const fundingOrganization = typeof raw.fundingOrganizationSnapshot === "string" ? raw.fundingOrganizationSnapshot : typeof raw.organizationSnapshot === "string" ? raw.organizationSnapshot : ""; const opportunityId = raw.opportunityId ? String(raw.opportunityId) : null; return { id: String(raw._id), opportunityId, proposalKind: raw.proposalKind === "general" || !opportunityId ? "general" as const : "opportunity" as const, opportunityTitle: String(raw.opportunityTitleSnapshot), fundingOrganization, organization: fundingOrganization, deadline: iso(raw.deadlineSnapshot), templateTitle: String(raw.templateTitleSnapshot), setupCompleted: raw.setupCompleted !== false, proposalMetadata: { projectTitle: typeof metadata.projectTitle === "string" ? metadata.projectTitle : "", applicantType: typeof metadata.applicantType === "string" ? metadata.applicantType : "", applicantName: typeof metadata.applicantName === "string" ? metadata.applicantName : "", applicantOrganization: typeof metadata.applicantOrganization === "string" ? metadata.applicantOrganization : "", amountRequested: typeof metadata.amountRequested === "number" ? metadata.amountRequested : undefined, currency: typeof metadata.currency === "string" ? metadata.currency : "", projectLocation: typeof metadata.projectLocation === "string" ? metadata.projectLocation : "", projectDuration: typeof metadata.projectDuration === "string" ? metadata.projectDuration : "", contactPerson: typeof metadata.contactPerson === "string" ? metadata.contactPerson : "", contactEmail: typeof metadata.contactEmail === "string" ? metadata.contactEmail : "" }, status: String(raw.status) as "draft" | "completed", progress: Number(raw.progress || 0), sections: ((raw.sections as Record<string, unknown>[]) || []).map((section) => ({ key: String(section.key), title: String(section.title), guidance: String(section.guidanceSnapshot || ""), prompt: String(section.promptSnapshot || ""), example: String(section.exampleSnapshot || ""), placeholder: String(section.placeholderSnapshot || ""), wordLimit: typeof section.wordLimit === "number" ? section.wordLimit : undefined, required: Boolean(section.required), order: Number(section.order), content: String(section.content || "") })).sort((a, b) => a.order - b.order), startedAt: iso(raw.startedAt), completedAt: iso(raw.completedAt), updatedAt: iso(raw.updatedAt) }; }
export type SerializedProposalApplication = ReturnType<typeof serializeApplication>;

async function requireProposalUserId() {
  const userId = await requireCurrentUserId();
  await connectToDatabase();
  if (!await UserProfile.exists({ userId, paid: true })) throw new AppError("Active access is required to use proposal tools.", "FORBIDDEN", 403);
  return userId;
}

const publishedTemplateFilter = { status: "published", sections: { $elemMatch: { $or: [{ enabled: true }, { enabled: { $exists: false } }] } } } as const;

export async function getAdminProposalContext(opportunityId: string) { await connection(); if (!isValidObjectId(opportunityId)) return null; await connectToDatabase(); const [opportunity, template] = await Promise.all([Opportunity.findById(opportunityId).lean(), ProposalTemplate.findOne({ opportunityId }).lean()]); if (!opportunity) return null; const contextOpportunity = { id: String(opportunity._id), title: String(opportunity.title), summary: opportunity.summary || "", description: opportunity.description || "", organization: String(opportunity.agency || opportunity.organization || "Organization not provided"), type: String(opportunity.type), deadline: iso(opportunity.deadline), applicantTypes: opportunity.applicantTypes || [], sectors: opportunity.sectors || [], eligibleCountries: opportunity.eligibleCountries || [], officialUrl: opportunity.officialUrl || null, metadata: (opportunity.metadata || {}) as Record<string, unknown> }; return { opportunity: contextOpportunity, recommendation: buildProposalRecommendation(contextOpportunity), template: template ? serializeTemplate(template as unknown as Record<string, unknown>) : null }; }
export async function getPublishedTemplate(opportunityId: string) {
  await connection();
  if (!isValidObjectId(opportunityId)) return null;
  await connectToDatabase();
  const [opportunity, specific, general] = await Promise.all([
    Opportunity.findById(opportunityId).lean(),
    ProposalTemplate.findOne({ opportunityId, ...publishedTemplateFilter }).lean(),
    ProposalTemplate.find({ $or: [{ scope: "general" }, { opportunityId: { $exists: false } }], ...publishedTemplateFilter }).sort({ updatedAt: -1 }).lean(),
  ]);
  if (specific) return serializeTemplate(specific as unknown as Record<string, unknown>);
  if (!opportunity) return null;
  const recommendation = buildProposalRecommendation({
    title: String(opportunity.title), description: String(opportunity.description || ""),
    type: String(opportunity.type), sectors: opportunity.sectors || [],
  });
  const serialized = general.map((item) => serializeTemplate(item as unknown as Record<string, unknown>));
  const selected = chooseFallbackTemplate(
    serialized.map((item) => ({ id: item.id, opportunityId: item.opportunityId, scope: item.scope, templateType: item.templateType, status: item.status, sectionCount: item.sections.length })),
    opportunityId,
    recommendation.recommendedTemplateType,
  );
  return selected ? serialized.find((item) => item.id === selected.id) || null : null;
}
export async function getExistingApplicationForOpportunity(opportunityId: string) {
  await connection();
  const userId = await requireProposalUserId();
  const application = await ProposalApplication.findOne({ userId, opportunityId }).select("_id").lean();
  return application ? String(application._id) : null;
}
export async function getProposalCreationOptions() {
  await connection();
  const userId = await requireProposalUserId();
  const [opportunities, rawTemplates, existing] = await Promise.all([
    Opportunity.find({ verificationStatus: "verified", status: { $in: ["open", "closing_soon", "upcoming"] } })
      .select("title agency organization type sectors description deadline").sort({ deadline: 1, title: 1 }).limit(100).lean(),
    ProposalTemplate.find(publishedTemplateFilter).sort({ updatedAt: -1 }).lean(),
    ProposalApplication.find({ userId }).select("_id opportunityId proposalTemplateId opportunityTitleSnapshot proposalMetadata updatedAt").sort({ updatedAt: -1 }).lean(),
  ]);
  const templates = rawTemplates.map((item) => serializeTemplate(item as unknown as Record<string, unknown>));
  const generalTemplates = templates.filter((template) => isGeneralProposalTemplate(template));
  const existingByOpportunity = new Map(existing.filter((item) => item.opportunityId).map((item) => [String(item.opportunityId), String(item._id)]));
  return {
    templates: templates.map((template) => ({ id: template.id, opportunityId: template.opportunityId, scope: template.scope, title: template.title, description: template.description, templateType: template.templateType })),
    opportunities: opportunities.map((opportunity) => {
      const id = String(opportunity._id);
      const recommended = buildProposalRecommendation({ title: String(opportunity.title), description: String(opportunity.description || ""), type: String(opportunity.type), sectors: opportunity.sectors || [] }).recommendedTemplateType;
      const applicableTemplateIds = templates.filter((template) =>
        template.opportunityId === id || (isGeneralProposalTemplate(template) && (template.templateType === recommended || template.templateType === "general"))
      ).map((template) => template.id);
      return { id, title: String(opportunity.title), organization: String(opportunity.agency || opportunity.organization || "Organization not provided"), type: String(opportunity.type), deadline: iso(opportunity.deadline), recommendedTemplateType: recommended, applicableTemplateIds, existingApplicationId: existingByOpportunity.get(id) || null };
    }),
    generalTemplates: generalTemplates.map((template) => template.id),
    recentGeneralProposals: existing.filter((item) => !item.opportunityId).slice(0, 5).map((item) => {
      const metadata = (item.proposalMetadata || {}) as { projectTitle?: string };
      return { id: String(item._id), title: metadata.projectTitle || String(item.opportunityTitleSnapshot), updatedAt: iso(item.updatedAt) };
    }),
  };
}
export type ProposalCreationOptions = Awaited<ReturnType<typeof getProposalCreationOptions>>;
export type StartProposalInput = { opportunityId?: string; templateId?: string };
export async function startProposal(input: StartProposalInput) {
  const { opportunityId, templateId } = input;
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

  let template = templateId ? await ProposalTemplate.findOne({ _id: templateId, ...publishedTemplateFilter }).lean() : null;
  if (!template && !templateId && opportunityId) {
    const selected = await getPublishedTemplate(opportunityId);
    if (selected) template = await ProposalTemplate.findById(selected.id).lean();
  }
  if (!template) throw new AppError("Choose an available published proposal template.", "NOT_FOUND", 404);

  const serializedTemplate = serializeTemplate(template as unknown as Record<string, unknown>);
  const candidate = { id: serializedTemplate.id, opportunityId: serializedTemplate.opportunityId, scope: serializedTemplate.scope, templateType: serializedTemplate.templateType, status: serializedTemplate.status, sectionCount: serializedTemplate.sections.filter((section) => section.enabled).length };
  if (!canUseProposalTemplate(candidate, opportunityId)) throw new AppError("This template cannot be used for the selected proposal.", "FORBIDDEN", 403);

  const templateSections = ((template.sections || []) as TemplateSection[]).filter((section) => section.enabled !== false).slice().sort((a, b) => a.order - b.order);
  const fundingOrganization = opportunity ? opportunity.agency || opportunity.organization || "" : "";
  const applicationData = {
    userId,
    ...(opportunityId ? { opportunityId } : {}),
    proposalKind: opportunityId ? "opportunity" : "general",
    proposalTemplateId: template._id,
    opportunityTitleSnapshot: opportunity ? opportunity.title : "General funding proposal",
    organizationSnapshot: fundingOrganization,
    fundingOrganizationSnapshot: fundingOrganization,
    deadlineSnapshot: opportunity?.deadline,
    templateTitleSnapshot: template.title,
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
