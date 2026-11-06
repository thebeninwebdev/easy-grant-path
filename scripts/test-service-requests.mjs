import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { paystackAmountFromStoredAmount, validatePaystackTransaction, verifyLegacyPaystackWebhookSignature, verifyPaystackWebhookSignature } from "../lib/paystack-policy.ts";
import { safeSecretEqual, validateFlutterwaveTransaction } from "../lib/flutterwave-policy.ts";
import { normalizeWhatsappNumber, whatsappUrl } from "../lib/service-request-policy.ts";

assert.equal(normalizeWhatsappNumber("+234 801 234 5678"), "+2348012345678");
assert.equal(normalizeWhatsappNumber("08012345678"), null);
assert.equal(whatsappUrl("+2250102030405", "Hello"), "https://wa.me/2250102030405?text=Hello");
assert.equal(safeSecretEqual("long-random-webhook-secret", "long-random-webhook-secret"), true);
assert.equal(safeSecretEqual("long-random-webhook-secret", "wrong"), false);

// XOF is stored and displayed as whole francs, but Paystack receives x100.
assert.equal(paystackAmountFromStoredAmount(1000, "XOF"), 100000);
assert.equal(paystackAmountFromStoredAmount(5000, "XOF"), 500000);
assert.equal(paystackAmountFromStoredAmount(10_000, "XOF"), 1_000_000);
assert.equal(paystackAmountFromStoredAmount(5000.5, "XOF"), null);
assert.equal(paystackAmountFromStoredAmount(5000, "NGN"), null);
assert.equal(paystackAmountFromStoredAmount(Number.MAX_SAFE_INTEGER, "XOF"), null);

const expected = { reference: "EGP-T-PR-reference", amountMinor: 5000, currency: "XOF", email: "user@example.com", paymentId: "payment-1", environment: "test" };
const paystack = { id: 12345, status: "success", reference: expected.reference, amount: 500000, currency: "XOF", channel: "mobile_money", customer: { email: "USER@example.com" }, metadata: JSON.stringify({ payment_id: "payment-1", product_id: "proposal_review", payment_environment: "test" }) };
assert.equal(validatePaystackTransaction(expected, paystack, "test").valid, true);
assert.equal(validatePaystackTransaction(expected, { ...paystack, amount: 5000 }, "test").valid, false);
assert.equal(validatePaystackTransaction(expected, { ...paystack, currency: "NGN" }, "test").valid, false);
assert.equal(validatePaystackTransaction(expected, { ...paystack, reference: "other" }, "test").valid, false);
assert.equal(validatePaystackTransaction(expected, { ...paystack, customer: { email: "other@example.com" } }, "test").valid, false);
assert.equal(validatePaystackTransaction(expected, { ...paystack, status: "pending" }, "test").valid, false);
assert.equal(validatePaystackTransaction(expected, paystack, "live").valid, false);

const raw = Buffer.from('{"event":"charge.success"}');
const secret = "whsec_test_secret";
const now = 1_760_270_400;
const signature = createHmac("sha512", secret).update(`${now}.`).update(raw).digest("hex");
assert.equal(verifyPaystackWebhookSignature(raw, `t=${now},v1=whk_test:${signature}`, secret, now), true);
assert.equal(verifyPaystackWebhookSignature(Buffer.from('{"event":"changed"}'), `t=${now},v1=whk_test:${signature}`, secret, now), false);
assert.equal(verifyPaystackWebhookSignature(raw, null, secret, now), false);
assert.equal(verifyPaystackWebhookSignature(raw, `t=${now - 301},v1=whk_test:${signature}`, secret, now), false);
const legacy = createHmac("sha512", "sk_test_secret").update(raw).digest("hex");
assert.equal(verifyLegacyPaystackWebhookSignature(raw, legacy, "sk_test_secret"), true);
assert.equal(verifyLegacyPaystackWebhookSignature(raw, legacy, "wrong"), false);

const flutterExpected = { reference: "legacy-reference", amountMinor: 250000, currency: "NGN", email: "user@example.com", paymentId: "payment-1", environment: "test" };
const flutterVerified = { id: 12345, status: "successful", tx_ref: flutterExpected.reference, amount: 2500, currency: "NGN", payment_type: "card", customer: { email: "USER@example.com" }, meta: { payment_id: "payment-1", payment_environment: "test" } };
assert.equal(validateFlutterwaveTransaction(flutterExpected, flutterVerified, "test").valid, true);

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const [checkout, webhook, payments, paymentModel, requestModel, config, products, callback] = await Promise.all([
  read("app/api/payments/checkout/route.ts"), read("app/api/webhooks/paystack/route.ts"), read("lib/payments.ts"), read("models/Payment.ts"), read("models/ServiceRequest.ts"), read("lib/paystack-config.ts"), read("lib/payment-products.ts"), read("app/dashboard/payments/callback/page.tsx"),
]);
assert.ok(checkout.indexOf("getCurrentSession()") < checkout.indexOf("readJsonBody(request)"));
assert.doesNotMatch(checkout, /amountMinor|currency/);
assert.match(webhook, /paystack-signature/); assert.match(webhook, /x-paystack-signature/); assert.match(webhook, /PaymentWebhookEvent/); assert.match(webhook, /verifyAndFulfillPayment/);
assert.match(payments, /verifyPaystackTransaction/); assert.match(payments, /validatePaystackTransaction/); assert.match(payments, /verifyFlutterwaveTransaction/); assert.match(payments, /fulfillmentStartedAt/);
assert.match(paymentModel, /enum: \["flutterwave", "paystack"\]/); assert.match(paymentModel, /provider: 1, providerTransactionId: 1/);
assert.match(requestModel, /paymentProvider: 1, providerTransactionId: 1/); assert.match(config, /PAYSTACK_WEBHOOK_SECRET/); assert.match(config, /sk_live_/); assert.match(products, /PLATFORM_ACCESS_PRICE_MINOR/); assert.match(callback, /query.reference \|\| query.tx_ref/);
console.log("Paystack payment policy tests passed");