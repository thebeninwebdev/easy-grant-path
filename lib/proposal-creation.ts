export type ProposalTemplateCandidate = {
  id: string;
  opportunityId: string | null;
  scope: "opportunity" | "general";
  templateType: string;
  status: string;
  sectionCount: number;
};

export function isGeneralProposalTemplate(template: Pick<ProposalTemplateCandidate, "scope" | "opportunityId">) {
  return template.scope === "general" || !template.opportunityId;
}

export function canUseProposalTemplate(template: ProposalTemplateCandidate, opportunityId?: string) {
  if (template.sectionCount < 1) return false;
  if (!opportunityId) return template.status === "published" && isGeneralProposalTemplate(template);
  if (template.opportunityId === opportunityId && !isGeneralProposalTemplate(template)) return template.status === "published";
  return template.status === "published" && isGeneralProposalTemplate(template);
}

export function proposalCreationAction(existingApplicationId: string | null) {
  return existingApplicationId
    ? { label: "Continue existing proposal", href: `/dashboard/proposals/${existingApplicationId}` }
    : { label: "Start preparing proposal", href: null };
}

export function chooseFallbackTemplate(
  templates: ProposalTemplateCandidate[],
  opportunityId: string,
  recommendedTemplateType: string,
) {
  return templates.find((template) => template.opportunityId === opportunityId && canUseProposalTemplate(template, opportunityId))
    || templates.find((template) => isGeneralProposalTemplate(template) && template.templateType === recommendedTemplateType && canUseProposalTemplate(template, opportunityId))
    || templates.find((template) => isGeneralProposalTemplate(template) && template.templateType === "general" && canUseProposalTemplate(template, opportunityId))
    || null;
}
