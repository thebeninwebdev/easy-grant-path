import { isOrganizationApplicantType, isPersonalApplicantType } from "./applicant-types.ts";

export type ProposalServiceId = "proposal_writing" | "proposal_review";
export type ProposalPricingCategory = "individual" | "organization";

const PRICES: Record<ProposalServiceId, Record<ProposalPricingCategory, number>> = {
  proposal_review: { individual: 7_500, organization: 12_500 },
  proposal_writing: { individual: 15_000, organization: 25_000 },
};

export function resolveProposalPricingCategory(applicantType?: string | null): ProposalPricingCategory | null {
  if (isPersonalApplicantType(applicantType)) return "individual";
  if (isOrganizationApplicantType(applicantType)) return "organization";
  return null;
}

export function getProposalServicePrice(serviceId: ProposalServiceId, applicantType?: string | null) {
  const category = resolveProposalPricingCategory(applicantType);
  return category ? { amountMinor: PRICES[serviceId][category], currency: "XOF" as const, category } : null;
}
