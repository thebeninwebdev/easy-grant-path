import "server-only";
import { AppError } from "@/lib/errors";
import { assertFlutterwaveConfig } from "@/lib/flutterwave-config";
import type { FlutterwaveTransaction } from "@/lib/flutterwave-policy";

type FlutterwaveResponse<T> = { status?: string; message?: string; data?: T };
async function request<T>(path: string, init?: RequestInit) {
  const config = assertFlutterwaveConfig();
  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${config.secretKey}`, "Content-Type": "application/json", Accept: "application/json", ...(init?.headers || {}) }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new AppError("Payment verification is temporarily unavailable. We will keep checking your payment.", "PAYMENT_VERIFICATION_PENDING", 503);
  }
  const payload = await response.json().catch(() => null) as FlutterwaveResponse<T> | null;
  if (!response.ok || payload?.status !== "success" || !payload.data) throw new AppError(response.status >= 500 ? "Flutterwave is temporarily unavailable." : "Flutterwave could not complete this request.", "FLUTTERWAVE_ERROR", response.status >= 500 ? 503 : 502);
  return payload.data;
}
export function createFlutterwaveCheckout(input: { reference: string; amount: string; currency: string; redirectUrl: string; customer: { email: string; name: string; phoneNumber?: string }; paymentId: string; productId: string; environment: "test" | "live" }) {
  return request<{ link?: unknown }>("/payments", { method: "POST", body: JSON.stringify({ tx_ref: input.reference, amount: input.amount, currency: input.currency, redirect_url: input.redirectUrl, customer: { email: input.customer.email, name: input.customer.name, ...(input.customer.phoneNumber ? { phonenumber: input.customer.phoneNumber } : {}) }, customizations: { title: "EasyGrantPath", description: input.productId === "proposal_writing" ? "Professional proposal writing assistance" : input.productId === "proposal_review" ? "Professional proposal review" : "EasyGrantPath access" }, meta: { payment_id: input.paymentId, product_id: input.productId, payment_environment: input.environment }, session_duration: 30, max_retry_attempt: 3 }) });
}
export function verifyFlutterwaveTransaction(input: { transactionId?: string; reference: string }) {
  return input.transactionId ? request<FlutterwaveTransaction>(`/transactions/${encodeURIComponent(input.transactionId)}/verify`) : request<FlutterwaveTransaction>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(input.reference)}`);
}
