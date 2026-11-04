import { z } from "zod";

export const COUNTRY_CODES = ["CI", "BJ", "BF", "GH", "GN", "ML", "NE", "NG", "SN", "TG", "CM", "KE", "ZA"] as const;
export const APPLICANT_TYPES = ["individual", "student", "startup_sme", "ngo_nonprofit", "researcher_academic", "community_organization", "other"] as const;
export const INTEREST_VALUES = ["entrepreneurship", "technology", "youth", "education", "agriculture", "climate", "health", "women_girls", "community_development", "research", "leadership", "scholarships_study"] as const;
export const OPPORTUNITY_TYPE_VALUES = ["grant", "fellowship", "scholarship", "accelerator", "other"] as const;
export const GOAL_VALUES = ["find_opportunities", "check_eligibility", "prepare_applications", "write_proposals"] as const;

const countryCode = z.enum(COUNTRY_CODES);
const applicantType = z.enum(APPLICANT_TYPES);
const interest = z.enum(INTEREST_VALUES);
const opportunityType = z.enum(OPPORTUNITY_TYPE_VALUES);
const goal = z.enum(GOAL_VALUES);

export const accountDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(160),
  countryCode,
}).strict();

export const fundingPreferencesSchema = z.object({
  applicantType,
  countryCode,
  interests: z.array(interest).min(1, "Choose at least one area of interest.").max(3),
  opportunityTypes: z.array(opportunityType).min(1, "Choose at least one opportunity type.").max(3),
  primaryGoal: goal,
}).strict();

export const onboardingProfileSchema = z.union([
  z.object({
    applicantType,
    onboardingCompleted: z.literal(false),
    onboardingSkipped: z.literal(false),
  }).strict(),
  z.object({
    fullName: z.string().trim().min(2).max(160).optional(),
    countryCode,
    interests: z.array(interest).min(1).max(3),
    opportunityTypes: z.array(opportunityType).min(1).max(3),
    onboardingCompleted: z.literal(true),
    onboardingSkipped: z.literal(false),
  }).strict(),
]);

export const organizationDetailsSchema = z.object({
  organizationType: z.enum(["startup_sme", "ngo_nonprofit", "community_organization"]),
  name: z.string().trim().min(2, "Enter the organization name.").max(200),
  countryCode,
  registrationStatus: z.enum(["registered", "in_progress", "not_registered"]),
}).strict();

export type AccountDetailsInput = z.infer<typeof accountDetailsSchema>;
export type FundingPreferencesInput = z.infer<typeof fundingPreferencesSchema>;
export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;
export type OrganizationDetailsInput = z.infer<typeof organizationDetailsSchema>;
