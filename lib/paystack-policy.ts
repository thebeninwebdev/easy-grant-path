import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentEnvironment } from "@/lib/paystack-config";

export type PaystackTransaction = { id?: unknown; reference?: unknown; status?: unknown; amount?: unknown; currency?: unknown; channel?: unknown; customer?: { email?: unknown }; metadata?: unknown };

function metadata(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null; } catch { return null; } }
  return null;
}

export function paystackAmountFromStoredAmount(amountMinor: number, currency: string) {
  if (currency !== "XOF" || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > Math.floor(Number.MAX_SAFE_INTEGER / 100)) return null;
  return amountMinor * 100;
}

export function validatePaystackTransaction(expected: { reference: string; amountMinor: number; currency: string; email: string; paymentId: string; environment: PaymentEnvironment }, data: PaystackTransaction, configuredEnvironment: PaymentEnvironment) {
  const id = typeof data.id === "number" && Number.isSafeInteger(data.id) && data.id > 0 ? String(data.id) : typeof data.id === "string" && /^\d+$/.test(data.id) ? data.id : null;
  const meta = metadata(data.metadata);
  const amount = typeof data.amount === "number" && Number.isSafeInteger(data.amount) ? data.amount : null;
  const expectedAmount = paystackAmountFromStoredAmount(expected.amountMinor, expected.currency);
  return { id, valid: Boolean(id && expectedAmount !== null && expected.environment === configuredEnvironment && data.status === "success" && data.reference === expected.reference && data.currency === expected.currency && amount === expectedAmount && typeof data.customer?.email === "string" && data.customer.email.toLowerCase() === expected.email.toLowerCase() && meta?.payment_id === expected.paymentId && meta?.product_id && meta?.payment_environment === expected.environment) };
}

export function verifyPaystackWebhookSignature(rawBody: Buffer, header: string | null, signingSecret: string, now = Math.floor(Date.now() / 1000)) {
  if (!header || !signingSecret) return false;
  const values = new Map<string, string[]>();
  for (const part of header.split(",")) { const index = part.indexOf("="); if (index > 0) { const key = part.slice(0, index).trim(); values.set(key, [...(values.get(key) || []), part.slice(index + 1).trim()]); } }
  const timestamp = Number(values.get("t")?.[0]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300) return false;
  const expected = createHmac("sha512", signingSecret).update(`${timestamp}.`).update(rawBody).digest();
  return (values.get("v1") || []).some((value) => { const signature = value.includes(":") ? value.slice(value.indexOf(":") + 1) : ""; if (!/^[a-f0-9]{128}$/i.test(signature)) return false; const candidate = Buffer.from(signature, "hex"); return candidate.length === expected.length && timingSafeEqual(candidate, expected); });
}

export function verifyLegacyPaystackWebhookSignature(rawBody: Buffer, signature: string | null, secretKey: string) {
  if (!signature || !secretKey || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  const candidate = Buffer.from(signature, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}