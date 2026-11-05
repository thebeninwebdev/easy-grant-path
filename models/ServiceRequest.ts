import { Schema, model, models, type InferSchemaType } from "mongoose";
const schema = new Schema({
  userId: { type: String, required: true, index: true },
  customerName: { type: String, required: true, trim: true, maxlength: 200 },
  customerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  customerWhatsapp: { type: String, required: true, maxlength: 16 },
  serviceType: { type: String, enum: ["proposal_review", "full_application_assistance"], required: true, index: true },
  amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  paymentProvider: { type: String, enum: ["paystack", "flutterwave"], required: true },
  paymentReference: { type: String, required: true, unique: true, index: true },
  providerTransactionId: { type: String, unique: true, sparse: true },
  paymentStatus: { type: String, enum: ["initialized", "paid", "failed"], default: "initialized", required: true, index: true },
  paymentConfirmedAt: Date,
  adminNotificationStatus: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending", required: true, index: true },
  adminNotificationAttempts: { type: Number, default: 0 },
  adminNotificationNextAttemptAt: Date,
  adminNotificationLastError: String,
  adminNotifiedAt: Date,
}, { timestamps: true });
schema.index({ paymentStatus: 1, createdAt: -1 });
schema.index({ adminNotificationStatus: 1, adminNotificationNextAttemptAt: 1 });
export type ServiceRequestDocument = InferSchemaType<typeof schema>;
export const ServiceRequest = models.ServiceRequest || model("ServiceRequest", schema);
