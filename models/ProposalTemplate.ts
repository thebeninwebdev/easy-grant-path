import { Schema, model, models, type InferSchemaType } from "mongoose";

export const PROPOSAL_TEMPLATE_TYPES = [
  "general", "ngo_community_development", "startup_sme", "youth_employment_skills",
  "women_girls_empowerment", "agriculture_food_security", "climate_environment",
  "education", "health_public_health", "research_academic", "fellowship_leadership",
  "scholarship_study",
  // Legacy values remain valid for ProposalTemplates created before the library expansion.
  "ngo_development", "startup_entrepreneurship", "research", "fellowship",
] as const;

const sectionSchema = new Schema({
  key: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  guidance: { type: String, required: true, trim: true },
  prompt: { type: String, trim: true },
  example: { type: String, trim: true },
  placeholder: { type: String, trim: true },
  wordLimit: { type: Number, min: 1 },
  enabled: { type: Boolean, default: true },
  required: { type: Boolean, default: true },
  order: { type: Number, required: true, min: 0 },
}, { _id: false });

const proposalTemplateSchema = new Schema({
  opportunityId: { type: Schema.Types.ObjectId, ref: "Opportunity" },
  scope: { type: String, enum: ["opportunity", "general"], default: "opportunity", index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  templateType: { type: String, enum: PROPOSAL_TEMPLATE_TYPES, default: "general" },
  sections: { type: [sectionSchema], default: [] },
  status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  recommendation: {
    source: { type: String, enum: ["automatic", "manual"] },
    confidence: { type: String, enum: ["low", "medium", "high"] },
    reasons: { type: [String], default: [] },
  },
  createdBy: { type: String, trim: true },
  updatedBy: { type: String, trim: true },
}, { timestamps: true });

proposalTemplateSchema.index(
  { opportunityId: 1 },
  { unique: true, partialFilterExpression: { opportunityId: { $type: "objectId" } } },
);
proposalTemplateSchema.index({ scope: 1, status: 1, templateType: 1, updatedAt: -1 });

proposalTemplateSchema.path("sections").validate((sections: Array<{ key: string; order: number }>) => {
  const keys = sections.map((section) => section.key);
  const orders = sections.map((section) => section.order);
  return new Set(keys).size === keys.length && new Set(orders).size === orders.length;
}, "Section keys and order values must be unique.");

export type ProposalTemplateDocument = InferSchemaType<typeof proposalTemplateSchema>;
export const ProposalTemplate = models.ProposalTemplate || model("ProposalTemplate", proposalTemplateSchema);
