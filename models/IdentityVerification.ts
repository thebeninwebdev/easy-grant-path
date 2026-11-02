import { Schema, model, models, type InferSchemaType } from "mongoose";

const reviewHistorySchema = new Schema({ action: { type: String, enum: ["submitted", "approved", "resubmission_requested", "resubmitted"], required: true }, note: String, actor: String, at: { type: Date, default: Date.now } }, { _id: false });
const identityVerificationSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  documentType: { type: String, enum: ["national_id", "passport", "drivers_license", "other_government_id"], required: true },
  documentFile: { storageKey: String, filename: String, mimeType: String, size: Number },
  verificationStatus: { type: String, enum: ["unverified", "pending", "verified", "action_required", "rejected"], default: "unverified", index: true },
  submittedAt: Date, reviewedAt: Date, reviewedBy: String, rejectionReason: String, reviewNote: String,
  reviewHistory: { type: [reviewHistorySchema], default: [] },
}, { timestamps: true });

export type IdentityVerificationDocument = InferSchemaType<typeof identityVerificationSchema>;
export const IdentityVerification = models.IdentityVerification || model("IdentityVerification", identityVerificationSchema);
