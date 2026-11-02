export const PERSONAL_APPLICANT_TYPES = ["individual", "student", "researcher_academic"] as const;
export const ORGANIZATION_APPLICANT_TYPES = ["startup_sme", "ngo_nonprofit", "community_organization"] as const;

export type PersonalApplicantType = (typeof PERSONAL_APPLICANT_TYPES)[number];
export type OrganizationApplicantType = (typeof ORGANIZATION_APPLICANT_TYPES)[number];

export function isPersonalApplicantType(value?: string | null): value is PersonalApplicantType {
  return PERSONAL_APPLICANT_TYPES.includes(value as PersonalApplicantType);
}

export function isOrganizationApplicantType(value?: string | null): value is OrganizationApplicantType {
  return ORGANIZATION_APPLICANT_TYPES.includes(value as OrganizationApplicantType);
}

export function requiresVerificationForAction(action: "paid_assistance" | "proposal_support" | "document_review" | "submission_assistance", status: string) {
  return ["paid_assistance", "proposal_support", "document_review", "submission_assistance"].includes(action) && status !== "verified";
}
