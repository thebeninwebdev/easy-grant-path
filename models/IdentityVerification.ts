import { Schema, model, models, type InferSchemaType } from "mongoose";
const history = new Schema({ action: { type: String, enum: ["submitted", "approved", "provisionally_approved", "resubmission_requested", "resubmitted", "rejected"], required: true }, note: { type: String, maxlength: 1000 }, actor: { type: String, required: true }, at: { type: Date, default: Date.now } }, { _id: false });
const file = new Schema({ storageKey: { type: String, required: true }, filename: { type: String, required: true }, mimeType: { type: String, enum: ["application/pdf", "image/jpeg", "image/png"], required: true }, size: { type: Number, required: true }, sha256: { type: String, required: true }, provider: { type: String, enum: ["vercel_blob"], required: true } }, { _id: false });
const schema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  documentType: { type: String, enum: ["national_id", "passport", "drivers_license", "other_government_id"], required: true },
  documentFile: { type: file, required: true },
  verificationStatus: { type: String, enum: ["unverified", "pending", "verified", "action_required", "rejected"], default: "unverified", index: true },
  submittedAt: Date, reviewedAt: Date, reviewedBy: String, rejectionReason: String, reviewNote: String,
  reviewHistory: { type: [history], default: [] },
}, { timestamps: true });
export type IdentityVerificationDocument = InferSchemaType<typeof schema>;
export const IdentityVerification = models.IdentityVerification || model("IdentityVerification", schema);
