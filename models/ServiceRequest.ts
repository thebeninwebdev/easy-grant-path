import { Schema, model, models, type InferSchemaType } from "mongoose";
const schema = new Schema({
  userId: { type: String, required: true, index: true }, customerName: { type: String, required: true, trim: true, maxlength: 200 }, customerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 }, customerWhatsapp: { type: String, required: true, maxlength: 16 },
  serviceType: { type: String, enum: ["proposal_writing", "proposal_review"], required: true, index: true }, serviceStatus: { type: String, enum: ["pending", "contacted"], default: "pending", required: true, index: true }, contactedAt: Date, contactedBy: String,
  amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger }, currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 }, paymentProvider: { type: String, enum: ["paystack", "flutterwave"], required: true }, paymentReference: { type: String, required: true, unique: true, index: true }, providerTransactionId: { type: String, sparse: true },
  paymentStatus: { type: String, enum: ["pending_payment", "paid", "failed", "cancelled", "initialized"], default: "pending_payment", required: true, index: true }, paymentConfirmedAt: Date,
  adminNotificationStatus: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending", required: true, index: true }, adminNotificationAttempts: { type: Number, default: 0 }, adminNotificationNextAttemptAt: Date, adminNotificationLastError: String, adminNotifiedAt: Date,
}, { timestamps: true });
schema.index({ paymentProvider: 1, providerTransactionId: 1 }, { unique: true, sparse: true }); schema.index({ paymentStatus: 1, serviceStatus: 1, createdAt: -1 }); schema.index({ userId: 1, serviceType: 1, paymentStatus: 1 }); schema.index({ adminNotificationStatus: 1, adminNotificationNextAttemptAt: 1 });
export type ServiceRequestDocument = InferSchemaType<typeof schema>;
export const ServiceRequest = models.ServiceRequest || model("ServiceRequest", schema);
