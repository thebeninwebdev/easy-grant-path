import "server-only";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { sendAdminServiceRequestEmail } from "@/lib/email";
import { getFlutterwaveConfig } from "@/lib/flutterwave-config";
import { formatPaymentAmount } from "@/lib/payment-products";
import { whatsappUrl } from "@/lib/service-request-policy";
import { ServiceRequest } from "@/models/ServiceRequest";

export async function createPaidProposalReviewRequest(input: { userId: string; customerName: string; customerEmail: string; customerWhatsapp: string; amountMinor: number; currency: string; paymentReference: string; providerTransactionId: string; paymentConfirmedAt: Date }) {
  await connectToDatabase();
  return ServiceRequest.findOneAndUpdate({ paymentReference: input.paymentReference }, { $setOnInsert: { userId: input.userId, customerName: input.customerName, customerEmail: input.customerEmail, customerWhatsapp: input.customerWhatsapp, serviceType: "proposal_review", amount: input.amountMinor, currency: input.currency, paymentProvider: "flutterwave", paymentReference: input.paymentReference, providerTransactionId: input.providerTransactionId, paymentStatus: "paid", paymentConfirmedAt: input.paymentConfirmedAt, adminNotificationStatus: "pending" } }, { upsert: true, returnDocument: "after", runValidators: true }).lean();
}
export async function dispatchServiceRequestNotification(id: string) {
  await connectToDatabase(); const now = new Date();
  const request = await ServiceRequest.findOneAndUpdate({ _id: id, paymentStatus: "paid", adminNotificationStatus: { $in: ["pending", "failed"] }, $or: [{ adminNotificationNextAttemptAt: null }, { adminNotificationNextAttemptAt: { $lte: now } }] }, { $set: { adminNotificationStatus: "sending" }, $inc: { adminNotificationAttempts: 1 } }, { returnDocument: "after" }).lean();
  if (!request) return;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL; const baseUrl = getFlutterwaveConfig().appUrl;
  const contactUrl = whatsappUrl(request.customerWhatsapp, "Hello, this is the EasyGrantPath team. We're reaching out regarding your proposal review request.");
  if (!adminEmail || !baseUrl || !contactUrl) { await ServiceRequest.updateOne({ _id: request._id, adminNotificationStatus: "sending" }, { $set: { adminNotificationStatus: "failed", adminNotificationLastError: "Notification configuration unavailable.", adminNotificationNextAttemptAt: new Date(Date.now() + 300_000) } }); return; }
  try {
    await sendAdminServiceRequestEmail({ email: adminEmail, customerName: request.customerName, customerEmail: request.customerEmail, whatsapp: request.customerWhatsapp, service: "Proposal Review", amount: formatPaymentAmount(request.amount, request.currency), reference: request.paymentReference, confirmedAt: request.paymentConfirmedAt?.toISOString() || now.toISOString(), adminUrl: `${baseUrl}/admin/service-requests`, whatsappUrl: contactUrl, idempotencyKey: `service-request/${request._id}` });
    await ServiceRequest.updateOne({ _id: request._id, adminNotificationStatus: "sending" }, { $set: { adminNotificationStatus: "sent", adminNotifiedAt: new Date(), adminNotificationLastError: null, adminNotificationNextAttemptAt: null } });
  } catch {
    const delay = Math.min(3_600_000, 60_000 * 2 ** Math.min(request.adminNotificationAttempts || 1, 6));
    await ServiceRequest.updateOne({ _id: request._id, adminNotificationStatus: "sending" }, { $set: { adminNotificationStatus: "failed", adminNotificationLastError: "Email delivery failed.", adminNotificationNextAttemptAt: new Date(Date.now() + delay) } });
  }
}
export async function retryDueServiceRequestNotifications() { await connectToDatabase(); const ids = await ServiceRequest.find({ paymentStatus: "paid", adminNotificationStatus: { $in: ["pending", "failed"] }, $or: [{ adminNotificationNextAttemptAt: null }, { adminNotificationNextAttemptAt: { $lte: new Date() } }] }).select("_id").limit(25).lean(); await Promise.all(ids.map((item) => dispatchServiceRequestNotification(String(item._id)))); return ids.length; }
export async function listAdminServiceRequests() { await requireAdmin(); await connection(); await connectToDatabase(); return ServiceRequest.find({ paymentStatus: "paid" }).sort({ paymentConfirmedAt: -1 }).limit(200).lean(); }