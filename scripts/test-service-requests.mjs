import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { safeSecretEqual, validateFlutterwaveTransaction } from "../lib/flutterwave-policy.ts";
import { normalizeWhatsappNumber, whatsappUrl } from "../lib/service-request-policy.ts";

assert.equal(normalizeWhatsappNumber("+234 801 234 5678"), "+2348012345678");
assert.equal(normalizeWhatsappNumber("08012345678"), null);
assert.equal(whatsappUrl("+2250102030405", "Hello"), "https://wa.me/2250102030405?text=Hello");
assert.equal(safeSecretEqual("long-random-webhook-secret", "long-random-webhook-secret"), true);
assert.equal(safeSecretEqual("long-random-webhook-secret", "wrong"), false);

const expected = { reference: "EGP-T-PR-reference", amountMinor: 250000, currency: "NGN", email: "user@example.com", paymentId: "payment-1", environment: "test" };
const verified = { id: 12345, status: "successful", tx_ref: expected.reference, amount: 2500, currency: "NGN", payment_type: "card", customer: { email: "USER@example.com" }, meta: { payment_id: "payment-1", payment_environment: "test" } };
assert.equal(validateFlutterwaveTransaction(expected, verified, "test").valid, true);
assert.equal(validateFlutterwaveTransaction(expected, { ...verified, amount: 1 }, "test").valid, false);
assert.equal(validateFlutterwaveTransaction(expected, verified, "live").valid, false);
assert.equal(validateFlutterwaveTransaction(expected, { ...verified, meta: { payment_id: "other", payment_environment: "test" } }, "test").valid, false);

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const [checkout, webhook, payments, paymentModel, requestModel, eventModel, config, products, email, admin, workspace, assistanceActions] = await Promise.all([
  read("app/api/payments/checkout/route.ts"), read("app/api/webhooks/flutterwave/route.ts"), read("lib/payments.ts"), read("models/Payment.ts"), read("models/ServiceRequest.ts"), read("models/PaymentWebhookEvent.ts"), read("lib/flutterwave-config.ts"), read("lib/payment-products.ts"), read("lib/email.ts"), read("app/api/admin/payments/route.ts"), read("components/proposals/proposal-workspace.tsx"), read("components/services/proposal-assistance-actions.tsx"),
]);
assert.ok(checkout.indexOf("getCurrentSession()") < checkout.indexOf("readJsonBody(request)"));
assert.doesNotMatch(checkout, /amountMinor|currency/);
assert.match(config, /VERCEL_ENV === "production"/); assert.match(config, /FLWSECK\(\?:_TEST\)\?-/); assert.match(config, /VERCEL_ENV === "preview"/); assert.match(config, /FLWSECK_TEST-/); assert.match(config, /!key\.startsWith\("FLWSECK_TEST-"\)/);
assert.match(webhook, /verif-hash/); assert.match(webhook, /safeSecretEqual/); assert.match(webhook, /PaymentWebhookEvent/); assert.match(webhook, /verifyAndFulfillPayment/);
assert.match(payments, /verifyFlutterwaveTransaction/); assert.match(payments, /validateFlutterwaveTransaction/); assert.match(payments, /environment !== config\.environment/); assert.match(payments, /findOneAndUpdate|updateOne/); assert.match(payments, /proposal_writing/); assert.match(payments, /proposal_review/);
assert.match(paymentModel, /reference: \{ type: String, required: true, unique: true/); assert.match(paymentModel, /providerTransactionId: \{ type: String, unique: true, sparse: true/); assert.match(requestModel, /serviceStatus/); assert.doesNotMatch(requestModel, /full_proposal_assistance|full_application_assistance/); assert.match(eventModel, /key: \{ type: String, required: true, unique: true/);
assert.match(products, /PLATFORM_ACCESS_PRICE_MINOR/); assert.match(products, /PROPOSAL_WRITING/); assert.match(products, /return null/); assert.match(email, /Idempotency-Key/); assert.match(email, /New Paid \$\{input\.service\} Request/); assert.match(admin, /listAdminPayments/); assert.match(workspace, /ProposalAssistanceActions/); assert.match(assistanceActions, /Get Proposal Review/); assert.match(assistanceActions, /Get Proposal Writing Help/); assert.doesNotMatch(assistanceActions, /proposalId/); assert.match(assistanceActions, /Continue to Payment/);
console.log("Flutterwave payment security tests passed");
