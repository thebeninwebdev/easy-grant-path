import "server-only";
import { AppError } from "@/lib/errors";
import { assertPaystackConfig, assertPaystackCredentials, type PaymentEnvironment } from "@/lib/paystack-config";
import type { PaystackTransaction } from "@/lib/paystack-policy";

type Response<T> = { status?: boolean; message?: string; data?: T };
async function request<T>(path: string, environment: PaymentEnvironment, init?: RequestInit, checkout = false) {
  const config = checkout ? assertPaystackConfig(environment) : assertPaystackCredentials(environment);
  let response: globalThis.Response;
  try { response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${config.secretKey}`, "Content-Type": "application/json", Accept: "application/json", ...(init?.headers || {}) }, cache: "no-store", signal: AbortSignal.timeout(15_000) }); }
  catch { throw checkout ? new AppError("Paystack checkout is temporarily unavailable.", "PAYMENT_INITIALIZATION_FAILED", 503) : new AppError("Payment verification is temporarily unavailable. We will keep checking your payment.", "PAYMENT_VERIFICATION_PENDING", 503); }
  const payload = await response.json().catch(() => null) as Response<T> | null;
  if (!response.ok || !payload?.status || !payload.data) throw new AppError(response.status >= 500 ? "Paystack is temporarily unavailable." : "Paystack could not complete this request.", "PAYSTACK_ERROR", response.status >= 500 ? 503 : 502);
  return payload.data;
}
export function createPaystackCheckout(input: { reference: string; amount: number; currency: "XOF"; callbackUrl: string; customer: { email: string; name: string }; paymentId: string; productId: string; environment: "test" | "live" }) {
  return request<{ authorization_url?: unknown; reference?: unknown }>("/transaction/initialize", input.environment, { method: "POST", body: JSON.stringify({ email: input.customer.email, amount: String(input.amount), currency: input.currency, reference: input.reference, callback_url: input.callbackUrl, metadata: JSON.stringify({ payment_id: input.paymentId, product_id: input.productId, payment_environment: input.environment, customer_name: input.customer.name }) }) }, true);
}
export function verifyPaystackTransaction(reference: string, environment: PaymentEnvironment) { return request<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, environment); }
