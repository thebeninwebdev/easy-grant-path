import { Schema, model, models, type InferSchemaType } from "mongoose";
const schema = new Schema({
  userId: { type: String, required: true, index: true }, customerName: { type: String, required: true, trim: true, maxlength: 200 }, customerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  reference: { type: String, required: true, unique: true, index: true }, provider: { type: String, enum: ["flutterwave"], required: true }, providerTransactionId: { type: String, unique: true, sparse: true },
  category: { type: String, enum: ["subscription", "service"], required: true, index: true }, productId: { type: String, enum: ["platform_access", "proposal_writing", "proposal_review"], required: true, index: true },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger }, currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 }, environment: { type: String, enum: ["test", "live"], required: true, index: true },
  status: { type: String, enum: ["pending", "processing", "successful", "failed", "cancelled"], default: "pending", required: true, index: true }, paymentMethod: { type: String, trim: true, maxlength: 80 }, checkoutLink: { type: String, maxlength: 2000 }, providerStatus: { type: String, maxlength: 80 }, failureCode: { type: String, maxlength: 100 }, failureMessage: { type: String, maxlength: 500 }, verifiedAt: Date, fulfilledAt: Date, serviceRequestId: { type: Schema.Types.ObjectId, ref: "ServiceRequest" }, metadata: { whatsappNumber: String, durationDays: Number },
}, { timestamps: true });
schema.index({ status: 1, environment: 1, createdAt: -1 }); schema.index({ userId: 1, createdAt: -1 });
export type PaymentDocument = InferSchemaType<typeof schema>;
export const Payment = models.Payment || model("Payment", schema);
