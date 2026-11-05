import { Schema, model, models, type InferSchemaType } from "mongoose";
import { ORGANIZATION_APPLICANT_TYPES } from "@/lib/applicant-types";
const history = new Schema({ action: { type: String, enum: ["submitted", "approved", "provisionally_approved", "resubmission_requested", "resubmitted", "rejected"], required: true }, note: { type: String, maxlength: 1000 }, actor: { type: String, required: true }, at: { type: Date, default: Date.now } }, { _id: false });
const schema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  organizationType: { type: String, enum: ORGANIZATION_APPLICANT_TYPES, required: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  countryCode: { type: String, required: true, trim: true, uppercase: true, length: 2 },
  registrationStatus: { type: String, enum: ["registered", "in_progress", "not_registered"], required: true },
  verificationStatus: { type: String, enum: ["unverified", "pending", "verified", "provisional", "action_required", "rejected"], default: "unverified", index: true },
  verificationSubmittedAt: Date, verifiedAt: Date, rejectedAt: Date, reviewedAt: Date, reviewedBy: String, rejectionReason: String, reviewNote: String,
  reviewHistory: { type: [history], default: [] },
}, { timestamps: true });
export type OrganizationProfileDocument = InferSchemaType<typeof schema>;
export const OrganizationProfile = models.OrganizationProfile || model("OrganizationProfile", schema);
