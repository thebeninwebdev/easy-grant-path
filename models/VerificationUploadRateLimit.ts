import { Schema, model, models } from "mongoose";
const schema = new Schema({ _id: { type: String, required: true }, count: { type: Number, required: true, default: 0 }, expiresAt: { type: Date, required: true, index: { expires: 0 } } }, { timestamps: true });
export const VerificationUploadRateLimit = models.VerificationUploadRateLimit || model("VerificationUploadRateLimit", schema);