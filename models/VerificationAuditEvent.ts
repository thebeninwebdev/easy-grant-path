import { Schema, model, models } from "mongoose";
const schema = new Schema({
  verificationKind: { type: String, enum: ["identity", "organization"], required: true, index: true, immutable: true },
  verificationId: { type: String, required: true, index: true, immutable: true },
  userId: { type: String, required: true, index: true, immutable: true },
  actorId: { type: String, required: true, index: true, immutable: true },
  actorType: { type: String, enum: ["user", "admin"], required: true, immutable: true },
  action: { type: String, required: true, immutable: true },
  fromStatus: { type: String, required: true, immutable: true },
  toStatus: { type: String, required: true, immutable: true },
  reason: { type: String, maxlength: 1000, immutable: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
for (const operation of ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"] as const) schema.pre(operation, function denyMutation() { throw new Error("Verification audit events are immutable."); });
schema.index({ verificationKind: 1, verificationId: 1, createdAt: -1 });
export const VerificationAuditEvent = models.VerificationAuditEvent || model("VerificationAuditEvent", schema);