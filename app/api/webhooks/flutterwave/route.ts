import { after } from "next/server";
import { AppError } from "@/lib/errors";
import { getFlutterwaveConfig } from "@/lib/flutterwave-config";
import { safeSecretEqual } from "@/lib/flutterwave-policy";
import { connectToDatabase } from "@/lib/db";
import { verifyAndFulfillPayment } from "@/lib/payments";
import { dispatchServiceRequestNotification } from "@/lib/service-requests";
import { PaymentWebhookEvent } from "@/models/PaymentWebhookEvent";

type EventData = { id?: unknown; tx_ref?: unknown; status?: unknown };
export async function POST(request: Request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 1_000_000) return Response.json({ error: "Request too large." }, { status: 413 });
  const config = getFlutterwaveConfig();
  if (!safeSecretEqual(config.webhookSecret, request.headers.get("verif-hash"))) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  let payload: unknown; try { payload = JSON.parse(raw); } catch { return Response.json({ error: "Malformed webhook payload." }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return Response.json({ error: "Malformed webhook payload." }, { status: 400 });
  const event = "event" in payload && typeof payload.event === "string" ? payload.event : "";
  const data = "data" in payload && payload.data && typeof payload.data === "object" ? payload.data as EventData : null;
  const transactionId = typeof data?.id === "number" || typeof data?.id === "string" ? String(data.id) : "";
  const paymentReference = typeof data?.tx_ref === "string" ? data.tx_ref : "";
  const providerStatus = typeof data?.status === "string" ? data.status : "unknown";
  if (!event || !data || !transactionId || !paymentReference) return Response.json({ error: "Malformed webhook event." }, { status: 400 });
  await connectToDatabase();
  const key = `${event}:${transactionId}:${providerStatus}`;
  await PaymentWebhookEvent.updateOne({ key }, { $setOnInsert: { key, event, transactionId, paymentReference, providerStatus, processingStatus: "pending" } }, { upsert: true, setDefaultsOnInsert: true });
  const stale = new Date(Date.now() - 5 * 60_000);
  const claimed = await PaymentWebhookEvent.findOneAndUpdate({ key, $or: [{ processingStatus: { $in: ["pending", "failed"] } }, { processingStatus: "processing", updatedAt: { $lte: stale } }] }, { $set: { processingStatus: "processing" }, $inc: { attempts: 1 } }, { returnDocument: "after" }).lean();
  if (!claimed) return Response.json({ received: true, duplicate: true });
  try {
    if (event === "charge.completed") {
      try {
        const result = await verifyAndFulfillPayment({ reference: paymentReference, transactionId });
        if (result.serviceRequestId) after(() => dispatchServiceRequestNotification(result.serviceRequestId!));
      } catch (error) {
        if (!(error instanceof AppError) || error.statusCode >= 500) throw error;
      }
    }
    await PaymentWebhookEvent.updateOne({ _id: claimed._id, processingStatus: "processing" }, { $set: { processingStatus: "processed", processedAt: new Date(), lastError: null } });
    return Response.json({ received: true });
  } catch {
    await PaymentWebhookEvent.updateOne({ _id: claimed._id, processingStatus: "processing" }, { $set: { processingStatus: "failed", lastError: "Webhook verification or fulfillment failed." } });
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}