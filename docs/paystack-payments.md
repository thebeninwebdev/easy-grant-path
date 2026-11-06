# Paystack payments

New checkouts use Paystack-hosted checkout. Historical Flutterwave records remain readable and their outstanding attempts continue through the Flutterwave verifier; new transactions are never sent to Flutterwave.

## Architecture

The authenticated checkout route selects a server-configured product, creates a `Payment`, creates a pending WhatsApp assistance request when required, and initializes `POST /transaction/initialize`. It returns only Paystack's `authorization_url`. The callback and webhook use `GET /transaction/verify/{reference}` before fulfillment. They verify the reference, amount, currency, email, payment ID/product/environment metadata, and provider transaction ID. Fulfillment is locked by the payment record, so duplicate callbacks/webhooks cannot extend access twice or create another request.

## XOF handling

Prices in the environment and MongoDB are whole human-readable XOF values: `5000` means 5,000 XOF. Paystack's API representation is explicitly `price * 100`, so this is sent as `500000`. Only positive safe-integer whole-XOF prices are accepted. No foreign-exchange conversion is performed.

## Configuration

```env
PAYMENT_PROVIDER=paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLATFORM_ACCESS_PRICE_MINOR=5000
PLATFORM_ACCESS_CURRENCY=XOF
PLATFORM_ACCESS_DURATION_DAYS=30
PROPOSAL_WRITING_PRICE_MINOR=10000
PROPOSAL_WRITING_CURRENCY=XOF
PROPOSAL_REVIEW_PRICE_MINOR=5000
PROPOSAL_REVIEW_CURRENCY=XOF
ADMIN_NOTIFICATION_EMAIL=operations@example.com
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=EasyGrantPath <billing@example.com>
```

`PAYSTACK_WEBHOOK_SIGNING_SECRET` is supported only as a temporary alias for deployment migration. The public key is not required because checkout is initialized solely on the server. Local development and Vercel Preview require `sk_test_`; a production deployment requires `sk_live_`, HTTPS, and never falls back to test credentials.

## Webhook

Register `https://www.easygrantpath.com/api/webhooks/paystack` in Paystack Dashboard > Developers > API configuration. Generate a signing secret and set `PAYSTACK_WEBHOOK_SECRET`. The handler reads the raw body, limits it to 1 MB, validates the timestamped `Paystack-Signature` SHA-512 HMAC within five minutes, and uses constant-time comparison. While a dashboard mode has no signing secret, the legacy `x-paystack-signature` HMAC with the Paystack secret key remains compatible. Only `charge.success` is fulfilled, and it is always independently verified with Paystack.

Paystack retries non-2xx webhooks; the event table namespaces IDs by provider and safely acknowledges duplicates. Email notification dispatch is deferred and retains the existing retry process.

## Products and fulfillment

Platform access is a one-off fixed-duration purchase, never an automatic recurring subscription. A verified purchase starts from its verification time when access is expired, or extends a still-active expiry. Proposal Writing and Proposal Review each create exactly one paid request with the supplied WhatsApp number; the customer sees: “Payment received. Our team will contact you on WhatsApp.” Resend notifies the admin with the contact, amount, service, and reference.

Paystack checkout displays only channels enabled on the merchant account. Confirm cards, Wave, Orange Money, and MTN Mobile Money with Paystack for this Côte d'Ivoire Starter Business account before advertising them; Moov Money is not advertised.

## Testing and deployment

For local webhook testing, run the application with test credentials and expose an HTTPS tunnel only for the test webhook URL. Complete a Paystack test transaction, then confirm the payment and assistance request in the dashboards. Before Vercel production activation, complete Starter Business approval/KYC, settlement setup, Côte d'Ivoire payment-channel activation, a verified Resend sender, the HTTPS webhook registration, and a low-value live validation. Do not claim a live payment succeeded until that validation has occurred.

Admins can reconcile recent pending payments; reconciliation always selects the payment's stored provider, never sends a legacy Flutterwave reference to Paystack. Roll back new checkout by setting `PAYMENT_PROVIDER` away from `paystack`; historical records and fulfillment data remain unchanged.