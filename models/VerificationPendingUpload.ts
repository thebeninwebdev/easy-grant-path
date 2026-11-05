import { Schema, model, models } from "mongoose";
const schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  kind: { type: String, enum: ["identity", "organization"], required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  consumedAt: Date,
}, { timestamps: true });
export const VerificationPendingUpload = models.VerificationPendingUpload || model("VerificationPendingUpload", schema);
