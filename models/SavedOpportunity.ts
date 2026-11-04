import { Schema, model, models, type InferSchemaType } from 'mongoose';

const savedOpportunitySchema = new Schema({
  userId: { type: String, required: true, index: true },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true, index: true },
}, { timestamps: true });

savedOpportunitySchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
savedOpportunitySchema.index({ userId: 1, createdAt: -1 });

export type SavedOpportunityDocument = InferSchemaType<typeof savedOpportunitySchema>;
export const SavedOpportunity = models.SavedOpportunity || model('SavedOpportunity', savedOpportunitySchema);
