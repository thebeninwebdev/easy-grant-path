import { Schema, model, models, type InferSchemaType } from "mongoose";

const fileSchema = new Schema({ storageKey: String, originalName: String, mimeType: String, size: Number }, { _id: false });
const historySchema = new Schema({ action: { type: String, enum: ["submitted", "approved", "resubmission_requested", "resubmitted"], required: true }, note: String, actor: String, at: { type: Date, default: Date.now } }, { _id: false });
const organizationVerificationSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true }, organizationProfileId: { type: Schema.Types.ObjectId, ref: "OrganizationProfile", required: true, index: true },
  registrationDocument: fileSchema, representativeId: { documentType: String, ...fileSchema.obj },
  status: { type: String, enum: ["unverified", "pending", "verified", "action_required", "rejected"], default: "unverified", index: true }, submittedAt: Date, reviewedAt: Date, reviewedBy: String, reviewNote: String, reviewHistory: { type: [historySchema], default: [] },
}, { timestamps: true });
export type OrganizationVerificationDocument = InferSchemaType<typeof organizationVerificationSchema>;
export const OrganizationVerification = models.OrganizationVerification || model("OrganizationVerification", organizationVerificationSchema);
