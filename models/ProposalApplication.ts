import { Schema, model, models, type InferSchemaType } from "mongoose";

const applicationSectionSchema = new Schema({
  key: { type: String, required: true },
  title: { type: String, required: true },
  guidanceSnapshot: String,
  promptSnapshot: String,
  exampleSnapshot: String,
  placeholderSnapshot: String,
  wordLimit: Number,
  required: { type: Boolean, default: true },
  order: { type: Number, required: true },
  content: { type: String, default: "" },
}, { _id: false });

const proposalApplicationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  locale: { type: String, enum: ["fr", "en"] },
  opportunityId: { type: Schema.Types.ObjectId, ref: "Opportunity" },
  proposalKind: { type: String, enum: ["opportunity", "general"], default: "opportunity", index: true },
  proposalTemplateId: { type: Schema.Types.ObjectId, ref: "ProposalTemplate", required: true },
  opportunityTitleSnapshot: { type: String, required: true },
  // Legacy field: this is the funding organization, never the applicant.
  organizationSnapshot: String,
  fundingOrganizationSnapshot: String,
  proposalMetadata: {
    projectTitle: String,
    applicantType: { type: String, enum: ["individual", "ngo_nonprofit", "startup_sme", "academic_research", "community_organization", "other"] },
    applicantName: String,
    applicantOrganization: String,
    amountRequested: { type: Number, min: 0 },
    currency: String,
    projectLocation: String,
    projectDuration: String,
    contactPerson: String,
    contactEmail: String,
  },
  setupCompleted: { type: Boolean, default: false },
  deadlineSnapshot: Date,
  templateTitleSnapshot: { type: String, required: true },
  sections: { type: [applicationSectionSchema], default: [] },
  status: { type: String, enum: ["draft", "completed"], default: "draft", index: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, { timestamps: true });

proposalApplicationSchema.index(
  { userId: 1, opportunityId: 1 },
  { unique: true, partialFilterExpression: { opportunityId: { $type: "objectId" } } },
);
proposalApplicationSchema.index({ userId: 1, updatedAt: -1 });

export type ProposalApplicationDocument = InferSchemaType<typeof proposalApplicationSchema>;
export const ProposalApplication = models.ProposalApplication || model("ProposalApplication", proposalApplicationSchema);
