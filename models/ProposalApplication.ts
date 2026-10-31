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
  opportunityId: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true, index: true },
  proposalTemplateId: { type: Schema.Types.ObjectId, ref: "ProposalTemplate", required: true },
  opportunityTitleSnapshot: { type: String, required: true },
  organizationSnapshot: String,
  deadlineSnapshot: Date,
  templateTitleSnapshot: { type: String, required: true },
  sections: { type: [applicationSectionSchema], default: [] },
  status: { type: String, enum: ["draft", "completed"], default: "draft", index: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, { timestamps: true });

proposalApplicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
proposalApplicationSchema.index({ userId: 1, updatedAt: -1 });

export type ProposalApplicationDocument = InferSchemaType<typeof proposalApplicationSchema>;
export const ProposalApplication = models.ProposalApplication || model("ProposalApplication", proposalApplicationSchema);
