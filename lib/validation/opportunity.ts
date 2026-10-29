import { z } from "zod";
import { OPPORTUNITY_TYPES } from "@/types/opportunities";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const optionalUrl = z.string().trim().max(2_000).optional().transform((value) => value || undefined).pipe(z.url().refine((value) => /^https?:\/\//i.test(value), "Only HTTP and HTTPS URLs are supported.").optional());
const optionalDate = z.string().trim().optional().transform((value) => value || undefined).refine((value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return !value;
  return new Date(`${value}T12:00:00.000Z`).toISOString().slice(0, 10) === value;
}, "Use a valid date in YYYY-MM-DD format.");
const list = z.array(z.string().trim().min(1).max(120)).max(100).default([]);

export const extractionRequestSchema = z.object({
  url: z.url().max(2_000).refine((value) => /^https?:\/\//i.test(value), "Only HTTP and HTTPS URLs are supported."),
}).strict();

export const manualOpportunitySchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(300),
  summary: optionalText(1_000),
  description: optionalText(50_000),
  organization: optionalText(300),
  agency: optionalText(300),
  type: z.enum(OPPORTUNITY_TYPES).default("grant"),
  countries: list,
  eligibleCountries: list,
  applicantTypes: list,
  sectors: list,
  fundingMin: z.number().nonnegative().finite().optional(),
  fundingMax: z.number().nonnegative().finite().optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency must be a three-letter code.").optional(),
  openingDate: optionalDate,
  deadline: optionalDate,
  opportunityNumber: optionalText(200),
  officialUrl: optionalUrl,
  discoveryUrl: optionalUrl,
  action: z.enum(["review", "verify"]),
}).strict().superRefine((value, context) => {
  if (value.fundingMin !== undefined && value.fundingMax !== undefined && value.fundingMin > value.fundingMax) {
    context.addIssue({ code: "custom", path: ["fundingMax"], message: "Maximum funding must be at least the minimum." });
  }
  if (value.openingDate && value.deadline && value.openingDate > value.deadline) {
    context.addIssue({ code: "custom", path: ["deadline"], message: "Deadline cannot be before the opening date." });
  }
});

export type ManualOpportunityInput = z.infer<typeof manualOpportunitySchema>;
