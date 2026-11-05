import "server-only";
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createFlutterwaveCheckout, verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { getFlutterwaveConfig } from "@/lib/flutterwave-config";
import { validateFlutterwaveTransaction } from "@/lib/flutterwave-policy";
import { getPaymentProduct, minorToMajorAmount } from "@/lib/payment-products";
import { normalizeWhatsappNumber } from "@/lib/service-request-policy";
import { createPaidProposalReviewRequest } from "@/lib/service-requests";
import { Payment } from "@/models/Payment";
import { UserProfile } from "@/models/UserProfile";

type SessionUser = { id: string; name?: string | null; email: string };
type PaymentShape = { _id: unknown; userId: string; customerName: string; customerEmail: string; reference: string; category: string; productId: string; amountMinor: number; currency: string; environment: "test" | "live"; status: string; paymentMethod?: string; createdAt?: Date; verifiedAt?: Date; serviceRequestId?: unknown; metadata?: { whatsappNumber?: string; durationDays?: number } };
function reference(productId: string, environment: "test" | "live") { return `EGP-${environment === "live" ? "L" : "T"}-${productId === "proposal_review" ? "PR" : "SUB"}-${randomUUID().replace(/-/g, "")}`; }
function publicPayment(payment: PaymentShape) { return { id: String(payment._id), reference: payment.reference, category: payment.category, productId: payment.productId, amountMinor: payment.amountMinor, currency: payment.currency, environment: payment.environment, status: payment.status, paymentMethod: payment.paymentMethod || null, createdAt: payment.createdAt, verifiedAt: payment.verifiedAt || null }; }
export async function initializePaymentCheckout(user: SessionUser, input: { productId: string; whatsappNumber?: string; saveWhatsapp?: boolean }) {
  const config = getFlutterwaveConfig(); const product = getPaymentProduct(input.productId);
  if (!config.enabled) throw new AppError("Flutterwave checkout is not safely configured for this environment.", "PAYMENT_UNAVAILABLE", 503);
  if (!product) throw new AppError("This payment product is not available.", "PRODUCT_UNAVAILABLE", 409);
  await connectToDatabase(); const profile = await UserProfile.findOne({ userId: user.id }).lean();
  if (!profile) throw new AppError("Complete your profile before purchasing this product.", "PROFILE_REQUIRED", 400);
  let whatsapp: string | undefined;
  if (product.id === "proposal_review") {
    whatsapp = normalizeWhatsappNumber(input.whatsappNumber || "") || undefined;
    if (!whatsapp) throw new AppError("Enter a WhatsApp number in international format, for example +2348012345678.", "INVALID_WHATSAPP", 400);
    const stored = normalizeWhatsappNumber(String(profile.whatsappNumber || ""));
    if (whatsapp !== stored && !input.saveWhatsapp) throw new AppError("Consent is required to save this WhatsApp number before payment.", "WHATSAPP_CONSENT_REQUIRED", 400);
    if (whatsapp !== stored) await UserProfile.updateOne({ userId: user.id }, { $set: { whatsappNumber: whatsapp, whatsappConsentAt: new Date() } }, { runValidators: true });
  }
  const txRef = reference(product.id, config.environment);
  const payment = await Payment.create({ userId: user.id, customerName: user.name?.trim() || profile.fullName || "Customer", customerEmail: user.email, reference: txRef, provider: "flutterwave", category: product.category, productId: product.id, amountMinor: product.amountMinor, currency: product.currency, environment: config.environment, status: "pending", metadata: { ...(whatsapp ? { whatsappNumber: whatsapp } : {}), ...(product.durationDays ? { durationDays: product.durationDays } : {}) } });
  try {
    const result = await createFlutterwaveCheckout({ reference: txRef, amount: minorToMajorAmount(product.amountMinor, product.currency), currency: product.currency, redirectUrl: `${config.appUrl}/dashboard/payments/callback`, customer: { email: user.email, name: payment.customerName, phoneNumber: whatsapp }, paymentId: String(payment._id), productId: product.id, environment: config.environment });
    if (typeof result.link !== "string" || !result.link.startsWith("https://checkout.flutterwave.com/")) throw new AppError("Flutterwave returned an invalid checkout link.", "FLUTTERWAVE_ERROR", 502);
    await Payment.updateOne({ _id: payment._id, status: "pending" }, { $set: { checkoutLink: result.link } });
    return { checkoutUrl: result.link, reference: txRef, environment: config.environment };
  } catch (error) { await Payment.updateOne({ _id: payment._id, status: "pending" }, { $set: { failureCode: "CHECKOUT_INITIALIZATION_FAILED", failureMessage: "Checkout initialization failed." } }); throw error; }
}
async function fulfillPayment(payment: PaymentShape, transactionId: string, paymentMethod: string | undefined) {
  const verifiedAt = new Date(); let serviceRequestId: string | undefined;
  if (payment.productId === "proposal_review") {
    const whatsapp = normalizeWhatsappNumber(String(payment.metadata?.whatsappNumber || ""));
    if (!whatsapp) throw new AppError("The paid service request has no valid WhatsApp number.", "FULFILLMENT_ERROR", 500);
    const request = await createPaidProposalReviewRequest({ userId: payment.userId, customerName: payment.customerName, customerEmail: payment.customerEmail, customerWhatsapp: whatsapp, amountMinor: payment.amountMinor, currency: payment.currency, paymentReference: payment.reference, providerTransactionId: transactionId, paymentConfirmedAt: verifiedAt });
    serviceRequestId = String(request?._id || "");
  } else if (payment.productId === "platform_access") {
    const durationDays = Number(payment.metadata?.durationDays);
    if (!Number.isSafeInteger(durationDays) || durationDays <= 0) throw new AppError("The subscription duration is not configured.", "FULFILLMENT_ERROR", 500);
    const expiresAt = new Date(verifiedAt.getTime() + durationDays * 86_400_000);
    await UserProfile.updateOne({ userId: payment.userId, accessPaymentReference: { $ne: payment.reference } }, { $set: { paid: true, accessStatus: "active", activatedAt: verifiedAt, accessExpiresAt: expiresAt, accessPaymentReference: payment.reference } });
  } else throw new AppError("This product is not enabled for fulfillment.", "FULFILLMENT_ERROR", 500);
  await Payment.updateOne({ _id: payment._id, status: { $ne: "successful" } }, { $set: { status: "successful", providerTransactionId: transactionId, paymentMethod, providerStatus: "successful", verifiedAt, fulfilledAt: verifiedAt, ...(serviceRequestId ? { serviceRequestId } : {}) }, $unset: { failureCode: 1, failureMessage: 1 } });
  return serviceRequestId;
}
export async function verifyAndFulfillPayment(input: { reference: string; transactionId?: string; userId?: string }) {
  await connectToDatabase(); const payment = await Payment.findOne({ reference: input.reference }).lean() as PaymentShape | null;
  if (!payment || (input.userId && payment.userId !== input.userId)) throw new AppError("Payment not found.", "NOT_FOUND", 404);
  if (payment.status === "successful") return { payment: publicPayment(payment), serviceRequestId: payment.serviceRequestId ? String(payment.serviceRequestId) : undefined };
  const config = getFlutterwaveConfig();
  if (!config.enabled || payment.environment !== config.environment) throw new AppError("This payment cannot be verified in the current environment.", "PAYMENT_ENVIRONMENT_MISMATCH", 409);
  let data;
  try { data = await verifyFlutterwaveTransaction({ transactionId: input.transactionId, reference: payment.reference }); }
  catch (error) { await Payment.updateOne({ _id: payment._id, status: { $in: ["pending", "processing"] } }, { $set: { failureCode: "VERIFICATION_UNAVAILABLE", failureMessage: "Verification is temporarily unavailable." } }); throw error; }
  if (data.status !== "successful") {
    const terminal = data.status === "cancelled" ? "cancelled" : data.status === "failed" ? "failed" : "pending";
    await Payment.updateOne({ _id: payment._id, status: { $ne: "successful" } }, { $set: { status: terminal, providerStatus: String(data.status || "unknown"), failureCode: terminal === "pending" ? "VERIFICATION_PENDING" : "PAYMENT_UNSUCCESSFUL", failureMessage: terminal === "pending" ? "Payment verification is pending." : "Flutterwave reported an unsuccessful payment." } });
    throw new AppError(terminal === "pending" ? "Payment verification is still pending." : terminal === "cancelled" ? "Payment was cancelled." : "Payment was unsuccessful.", terminal === "pending" ? "PAYMENT_VERIFICATION_PENDING" : "PAYMENT_UNSUCCESSFUL", terminal === "pending" ? 503 : 409);
  }
  const checked = validateFlutterwaveTransaction({ reference: payment.reference, amountMinor: payment.amountMinor, currency: payment.currency, email: payment.customerEmail, paymentId: String(payment._id), environment: payment.environment }, data, config.environment);
  if (!checked.valid || !checked.id) { await Payment.updateOne({ _id: payment._id, status: { $ne: "successful" } }, { $set: { status: "failed", failureCode: "VERIFICATION_MISMATCH", failureMessage: "Verified transaction details did not match the payment record." } }); throw new AppError("Payment details did not match this checkout.", "PAYMENT_MISMATCH", 409); }
  const serviceRequestId = await fulfillPayment(payment, checked.id, typeof data.payment_type === "string" ? data.payment_type : undefined);
  const updated = await Payment.findById(payment._id).lean() as unknown as PaymentShape;
  return { payment: publicPayment(updated), serviceRequestId };
}
export async function listUserPayments(userId: string) { await connection(); await connectToDatabase(); const items = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(); return items.map((item) => publicPayment(item as unknown as PaymentShape)); }
export async function listAdminPayments(filter?: { status?: string; environment?: string }) { await requireAdmin(); await connection(); await connectToDatabase(); const query: Record<string, unknown> = {}; if (filter?.status) query.status = filter.status; if (filter?.environment) query.environment = filter.environment; return Payment.find(query).sort({ createdAt: -1 }).limit(250).lean(); }
export async function reconcilePendingPayments() { await connectToDatabase(); const items = await Payment.find({ status: { $in: ["pending", "processing"] }, createdAt: { $gte: new Date(Date.now() - 7 * 86_400_000) } }).select("reference").limit(50).lean(); const serviceRequestIds: string[] = []; let verified = 0; for (const item of items) { try { const result = await verifyAndFulfillPayment({ reference: item.reference }); verified += result.payment.status === "successful" ? 1 : 0; if (result.serviceRequestId) serviceRequestIds.push(result.serviceRequestId); } catch (error) { if (error instanceof AppError && error.statusCode < 500) continue; } } return { checked: items.length, verified, serviceRequestIds }; }