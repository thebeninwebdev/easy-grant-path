import { z } from "zod";
import { OPPORTUNITY_TYPES } from "@/types/opportunities";

const nullableText = z.string().trim().max(50_000).nullable();

export const generatedOpportunitySchema = z.object({
  title: z.string().trim().max(300).nullable(), organization: z.string().trim().max(300).nullable(), agency: z.string().trim().max(300).nullable(),
  type: z.enum(OPPORTUNITY_TYPES).nullable(), summary: z.string().trim().max(1_000).nullable(), description: nullableText,
  countries: z.array(z.string().trim().min(1).max(120)).max(100).default([]), eligibleCountries: z.array(z.string().trim().min(1).max(120)).max(100).default([]), applicantTypes: z.array(z.string().trim().min(1).max(120)).max(100).default([]), sectors: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  fundingMin: z.number().nonnegative().finite().nullable(), fundingMax: z.number().nonnegative().finite().nullable(), fundingText: z.string().trim().max(500).nullable(), currency: z.string().trim().regex(/^[A-Za-z]{3}$/).nullable(), openingDate: z.string().nullable(), deadline: z.string().nullable(),
  eligibility: z.array(z.string().trim().min(1).max(1_000)).max(50).default([]), requirements: z.array(z.string().trim().min(1).max(1_000)).max(50).default([]), applicationProcess: z.array(z.string().trim().min(1).max(1_000)).max(50).default([]),
  officialUrl: z.string().url().nullable(), sourceUrl: z.string().url(), sourceTitle: z.string().trim().max(500).nullable(), confidence: z.number().min(0).max(1).nullable(), warnings: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
}).strict();
export type GeneratedOpportunity = z.infer<typeof generatedOpportunitySchema>;
