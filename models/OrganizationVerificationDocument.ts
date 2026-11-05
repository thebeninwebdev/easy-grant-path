import { Schema, model, models, type InferSchemaType } from "mongoose";
const file = new Schema({ storageKey: { type: String, required: true }, filename: { type: String, required: true }, mimeType: { type: String, enum: ["application/pdf", "image/jpeg", "image/png"], required: true }, size: { type: Number, required: true }, sha256: { type: String, required: true }, provider: { type: String, enum: ["vercel_blob"], required: true } }, { _id: false });
const schema = new Schema({
  userId: { type: String, required: true, index: true },
  organizationProfileId: { type: Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ["registration_certificate", "authorized_representative_id"], required: true },
  storage: { type: file, required: true },
  status: { type: String, enum: ["pending", "verified", "provisional", "action_required", "rejected"], default: "pending" },
  submittedAt: Date, reviewedAt: Date, reviewedBy: String, rejectionReason: String,
}, { timestamps: true });
schema.index({ userId: 1, type: 1 }, { unique: true });
export type OrganizationVerificationDocumentDocument = InferSchemaType<typeof schema>;
export const OrganizationVerificationDocument = models.OrganizationVerificationDocument || model("OrganizationVerificationDocument", schema);
