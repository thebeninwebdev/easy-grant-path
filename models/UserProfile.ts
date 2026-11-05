import { Schema, model, models, type InferSchemaType } from "mongoose";
export const APPLICANT_PROFILE_TYPES = ["individual", "student", "startup_sme", "ngo_nonprofit", "researcher_academic", "community_organization", "other"] as const;
export const ACCESS_STATUSES = ["inactive", "pending", "active", "failed", "cancelled"] as const;
const userProfileSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, trim: true },
  applicantType: { type: String, enum: APPLICANT_PROFILE_TYPES },
  countryCode: { type: String, trim: true, uppercase: true },
  whatsappNumber: { type: String, trim: true, maxlength: 16 },
  whatsappConsentAt: Date,
  declaredPreferences: { interests: { type: [String], default: [] }, opportunityTypes: { type: [String], default: [] } },
  inferredPreferences: { opportunityTypes: { type: [String], default: [] }, sectors: { type: [String], default: [] } },
  primaryGoal: { type: String, enum: ["find_opportunities", "check_eligibility", "prepare_applications", "write_proposals"] },
  primaryGoals: { type: [String], default: [] },
  onboardingCompleted: { type: Boolean, default: false },
  onboardingSkipped: { type: Boolean, default: false },
  paid: { type: Boolean, default: false, index: true },
  accessStatus: { type: String, enum: ACCESS_STATUSES, default: "inactive", index: true },
  accountStatus: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  adminNotes: { type: String, maxlength: 5_000 },
  suspendedAt: Date,
  suspendedBy: String,
  activatedAt: Date,
  accessExpiresAt: Date,
  accessPaymentReference: { type: String, trim: true },
  lastActivityAt: Date,
}, { timestamps: true });
userProfileSchema.index({ countryCode: 1, applicantType: 1, createdAt: -1 });
userProfileSchema.index({ accountStatus: 1, accessStatus: 1, createdAt: -1 });
export type UserProfileDocument = InferSchemaType<typeof userProfileSchema>;
export const UserProfile = models.UserProfile || model("UserProfile", userProfileSchema);
