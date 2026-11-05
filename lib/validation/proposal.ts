import { z } from "zod";
import { PROPOSAL_TEMPLATE_TYPES } from "@/models/ProposalTemplate";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
export const proposalSectionSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,79}$/, "Use a stable lowercase section key."),
  title: z.string().trim().min(1).max(160),
  guidance: z.string().trim().min(1).max(4_000),
  prompt: optionalText(4_000), example: optionalText(4_000), placeholder: optionalText(1_000),
  wordLimit: z.number().int().min(1).max(20_000).optional(),
  enabled: z.boolean().default(true), required: z.boolean(), order: z.number().int().min(0),
}).strict();

export const proposalTemplateInputSchema = z.object({
  title: z.string().trim().min(1).max(200), description: optionalText(2_000),
  templateType: z.enum(PROPOSAL_TEMPLATE_TYPES), sections: z.array(proposalSectionSchema).max(50),
  status: z.enum(["draft", "published"]),
  recommendation: z.object({ source: z.enum(["automatic", "manual"]), confidence: z.enum(["low", "medium", "high"]).optional(), reasons: z.array(z.string().max(500)).max(20).optional() }).optional(),
}).strict().superRefine((value, context) => {
  if (value.status === "published" && !value.sections.some((section) => section.enabled)) context.addIssue({ code: "custom", path: ["sections"], message: "Enable at least one section before publishing." });
  const keys = value.sections.map((section) => section.key); const orders = value.sections.map((section) => section.order);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", path: ["sections"], message: "Section keys must be unique." });
  if (new Set(orders).size !== orders.length) context.addIssue({ code: "custom", path: ["sections"], message: "Section order values must be unique." });
});

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Choose a valid record.");
export const startProposalSchema = z.object({
  opportunityId: objectId.optional(),
  templateId: objectId.optional(),
}).strict().superRefine((value, context) => {
  if (!value.opportunityId && !value.templateId) context.addIssue({ code: "custom", message: "Choose an opportunity or a general template." });
});
export const updateProposalSchema = z.object({ sectionKey: z.string().trim().min(1).max(80), content: z.string().max(100_000) }).strict();
export const APPLICANT_TYPES = ["individual", "ngo_nonprofit", "startup_sme", "academic_research", "community_organization", "other"] as const;
const proposalMetadataShape = z.object({
  projectTitle: z.string().trim().min(2, "Enter a project title.").max(200),
  applicantType: z.enum(APPLICANT_TYPES, { error: "Choose an applicant type." }),
  applicantName: optionalText(160), applicantOrganization: optionalText(200),
  amountRequested: z.number().positive("Amount requested must be greater than zero.").optional(),
  currency: z.enum(["USD", "EUR", "GBP", "XOF", "NGN", "GHS"]).optional(),
  projectLocation: z.string().trim().min(2, "Enter the primary project location.").max(200),
  projectDuration: optionalText(120), contactPerson: optionalText(160), contactEmail: z.email("Enter a valid contact email.").optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.applicantType === "individual" && !value.applicantName) context.addIssue({ code: "custom", path: ["applicantName"], message: "Enter the applicant's full name." });
  if (value.applicantType !== "individual" && !value.applicantOrganization) context.addIssue({ code: "custom", path: ["applicantOrganization"], message: "Enter the organization name." });
  if (value.amountRequested && !value.currency) context.addIssue({ code: "custom", path: ["currency"], message: "Choose a currency for the requested amount." });
});
export const updateProposalMetadataSchema = z.object({ metadata: proposalMetadataShape }).strict();
export const completeProposalSchema = z.object({ action: z.literal("complete") }).strict();
export type ProposalTemplateType = (typeof PROPOSAL_TEMPLATE_TYPES)[number];
export type ProposalTemplateSectionInput = z.infer<typeof proposalSectionSchema>;
export type ProposalTemplateInput = z.infer<typeof proposalTemplateInputSchema>;
export type ProposalMetadataInput = z.infer<typeof proposalMetadataShape>;
