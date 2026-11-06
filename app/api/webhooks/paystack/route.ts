import { after } from "next/server";
import { AppError } from "@/lib/errors";
import { getPaystackConfig } from "@/lib/paystack-config";
import { verifyLegacyPaystackWebhookSignature, verifyPaystackWebhookSignature } from "@/lib/paystack-policy";
import { connectToDatabase } from "@/lib/db";
import { verifyAndFulfillPayment } from "@/lib/payments";
import { dispatchServiceRequestNotification } from "@/lib/service-requests";
import { PaymentWebhookEvent } from "@/models/PaymentWebhookEvent";

type EventData = { id?: unknown; reference?: unknown; status?: unknown };
export async function POST(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());
  if (raw.byteLength > 1_000_000) return Response.json({ error: "Request too large." }, { status: 413 });
  const config = getPaystackConfig();
  const signature = request.headers.get("paystack-signature");
  const legacySignature = request.headers.get("x-paystack-signature");
  const signed = config.webhookSigningSecret ? verifyPaystackWebhookSignature(raw, signature, config.webhookSigningSecret) : verifyLegacyPaystackWebhookSignature(raw, legacySignature, config.secretKey);
  if (!signed) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  let payload: unknown; try { payload = JSON.parse(raw.toString("utf8")); } catch { return Response.json({ error: "Malformed webhook payload." }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return Response.json({ error: "Malformed webhook payload." }, { status: 400 });
  const event = "event" in payload && typeof payload.event === "string" ? payload.event : "";
  const data = "data" in payload && payload.data && typeof payload.data === "object" ? payload.data as EventData : null;
  const transactionId = typeof data?.id === "number" || typeof data?.id === "string" ? String(data.id) : "";
  const reference = typeof data?.reference === "string" ? data.reference : "";
  if (!event || !data || !transactionId || !reference) return Response.json({ error: "Malformed webhook event." }, { status: 400 });
  await connectToDatabase();
  const key = `paystack:${event}:${transactionId}`;
  await PaymentWebhookEvent.updateOne({ key }, { $setOnInsert: { key, event, transactionId, paymentReference: reference, providerStatus: typeof data.status === "string" ? data.status : "unknown", processingStatus: "pending" } }, { upsert: true, setDefaultsOnInsert: true });
  const stale = new Date(Date.now() - 5 * 60_000);
  const claimed = await PaymentWebhookEvent.findOneAndUpdate({ key, $or: [{ processingStatus: { $in: ["pending", "failed"] } }, { processingStatus: "processing", updatedAt: { $lte: stale } }] }, { $set: { processingStatus: "processing" }, $inc: { attempts: 1 } }, { returnDocument: "after" }).lean();
  if (!claimed) return Response.json({ received: true, duplicate: true });
  try {
    if (event === "charge.success") { try { const result = await verifyAndFulfillPayment({ reference, transactionId }); if (result.serviceRequestId) after(() => dispatchServiceRequestNotification(result.serviceRequestId!)); } catch (error) { if (!(error instanceof AppError) || error.statusCode >= 500) throw error; } }
    await PaymentWebhookEvent.updateOne({ _id: claimed._id, processingStatus: "processing" }, { $set: { processingStatus: "processed", processedAt: new Date(), lastError: null } });
    return Response.json({ received: true });
  } catch {
    await PaymentWebhookEvent.updateOne({ _id: claimed._id, processingStatus: "processing" }, { $set: { processingStatus: "failed", lastError: "Webhook verification or fulfillment failed." } });
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}