import { Schema, model, models, type InferSchemaType } from "mongoose";

const organizationVerificationDocumentSchema = new Schema({
  userId: { type: String, required: true, index: true }, organizationProfileId: { type: Schema.Types.ObjectId, ref: "OrganizationProfile", required: true, index: true },
  type: { type: String, enum: ["registration_certificate", "authorized_representative_id", "statutes_constitution", "tax_document", "bank_document", "financial_statement", "other"], required: true },
  storage: { storageKey: String, filename: String, mimeType: String, size: Number },
  status: { type: String, enum: ["pending", "verified", "action_required", "rejected"], default: "pending" }, submittedAt: Date, reviewedAt: Date, reviewedBy: String, rejectionReason: String,
}, { timestamps: true });
organizationVerificationDocumentSchema.index({ userId: 1, type: 1 }, { unique: true });
export type OrganizationVerificationDocumentDocument = InferSchemaType<typeof organizationVerificationDocumentSchema>;
export const OrganizationVerificationDocument = models.OrganizationVerificationDocument || model("OrganizationVerificationDocument", organizationVerificationDocumentSchema);
