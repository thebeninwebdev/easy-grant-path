import { Schema, model, models } from "mongoose";
const auditLogSchema = new Schema({
  actorId: { type: String, required: true, index: true }, actorEmail: String, actorRole: String,
  action: { type: String, required: true, index: true }, resourceType: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true }, summary: { type: String, required: true, maxlength: 1_000 },
  reason: { type: String, maxlength: 1_000 }, requestMetadata: { ipHash: String, userAgent: String },
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);
