# Flutterwave payments

EasyGrantPath uses Flutterwave Standard v3 hosted checkout. The browser receives only a hosted checkout URL; initialization, credential selection, transaction verification, and fulfillment run on the server.

Official references:

- [Flutterwave Standard](https://developer.flutterwave.com/docs/flutterwave-standard-1)
- [Transaction verification](https://developer.flutterwave.com/docs/transaction-verification)
- [Webhooks](https://developer.flutterwave.com/docs/webhooks)
- [Authentication and API-key modes](https://developer.flutterwave.com/docs/authentication)
- [Official test payment methods](https://developer.flutterwave.com/docs/testing)

## Environment selection

The server chooses the payment mode. Requests, headers, query strings, and browser code cannot override it.

| Deployment | Mode | Required key |
| --- | --- | --- |
| Local development (`NODE_ENV=development`) | Test | `FLWSECK_TEST-...` |
| Vercel Preview (`VERCEL_ENV=preview`) | Test | `FLWSECK_TEST-...` |
| Vercel Production (`VERCEL_ENV=production`) | Live | `FLWSECK-...` without `_TEST` |
| Non-Vercel production build/runtime | Live | Live key |

A wrong-mode key disables checkout. Production never falls back to a test key, and preview/development never accepts a live key.

## Local setup

1. Switch the Flutterwave dashboard to Test Mode and copy the v3 test secret key.
2. Create a random webhook secret hash in the Flutterwave dashboard.
3. Add these values to `.env.local`:

```env
FLW_PUBLIC_KEY=FLWPUBK_TEST-...
FLW_SECRET_KEY=FLWSECK_TEST-...
FLW_WEBHOOK_SECRET=<at-least-16-random-characters>
NEXT_PUBLIC_APP_URL=http://localhost:3000
PROPOSAL_REVIEW_PRICE_MINOR=<approved-integer-minor-unit-price>
PROPOSAL_REVIEW_CURRENCY=<approved-ISO-4217-currency>
ADMIN_NOTIFICATION_EMAIL=support@example.com
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=EasyGrantPath <payments@verified-domain.example>
```

The public key is optional because Standard checkout is initialized server-side. Do not place the secret key or webhook secret in a `NEXT_PUBLIC_` variable.

Run `corepack yarn dev`, sign in with a verified account, and open `/dashboard/services/proposal-review`. Use only an [official Flutterwave test payment method](https://developer.flutterwave.com/docs/testing).

## Local webhooks

Flutterwave needs a public HTTPS endpoint. Run an approved tunnel such as Cloudflare Tunnel or ngrok to port 3000, set `NEXT_PUBLIC_APP_URL` to that HTTPS origin, restart the app, and configure:

```text
https://your-temporary-host.example/api/webhooks/flutterwave
```

Set the dashboard secret hash to the exact `FLW_WEBHOOK_SECRET`. Enable webhook retries. Never expose a tunnel backed by live credentials from a development machine.

Test successful, failed, cancelled, duplicate, delayed, and invalid-signature events. The callback and webhook both re-query Flutterwave; neither grants value from redirect or webhook data alone.

## Vercel Preview

Configure Preview-scoped values using Flutterwave Test Mode credentials. `NEXT_PUBLIC_APP_URL` must be the stable preview origin used in Flutterwave redirects and webhook configuration. If preview URLs change per deployment, use an approved stable preview alias or test webhook relay. Never add live credentials to Preview scope.

## Vercel Production

Configure Production-scoped values with Flutterwave Live Mode credentials and the canonical HTTPS application origin. Set the production webhook URL to:

```text
https://your-production-domain.example/api/webhooks/flutterwave
```

The Flutterwave dashboard secret hash must match `FLW_WEBHOOK_SECRET`. A deployment with a test key, missing webhook secret, non-HTTPS URL, missing product price, or incomplete email configuration keeps checkout disabled.

## Product behavior

### Proposal Review

`PROPOSAL_REVIEW_PRICE_MINOR` and `PROPOSAL_REVIEW_CURRENCY` are trusted server-side values. A verified payment creates one paid service request, sends one retry-safe admin email, appears in the admin dashboard, and exposes a WhatsApp contact link. The website does not accept proposal uploads or manage review work.

### Platform subscription

No approved subscription price or duration currently exists in the repository. Subscription checkout therefore remains disabled. The existing `appConfig.platformAccess` entry must remain disabled until the business confirms its tier, price, currency, and duration. Once those existing values are supplied with provider `flutterwave`, the activation page uses the same verified ledger and fixed-duration fulfillment path; recurring billing is not enabled.

### Full Application Assistance

No approved price or purchase flow currently exists, so the product remains unavailable. Add it to the trusted server-side catalog only after pricing and business approval.

## Reconciliation and support

Customers can revisit `/dashboard/payments` and use the callback retry action. Administrators can use **Payments → Reconcile pending** to verify recent pending records by transaction reference. Duplicate callbacks and webhooks are safe because payment references, Flutterwave transaction IDs, webhook event keys, and fulfilled service-request references are unique.

Common failures:

- **Checkout disabled:** confirm key mode, webhook secret length, application URL, product price/currency, Resend, and admin email.
- **401 webhook:** the dashboard secret hash and `FLW_WEBHOOK_SECRET` differ.
- **Verification pending:** Flutterwave timed out or has not finalized the payment; retry or reconcile later.
- **Verification mismatch:** reference, amount, currency, customer email, metadata, environment, or transaction ID did not match. Do not fulfill manually without investigating in Flutterwave.
- **No admin email:** check the Service Requests notification status, Resend domain, and retry button.

## Test checklist

- Successful and failed Proposal Review payment
- Cancelled checkout
- Duplicate callback and webhook delivery
- Invalid `verif-hash`
- Incorrect amount, currency, email, reference, metadata, or environment
- Flutterwave verification timeout and later reconciliation
- Unauthorized checkout and verification requests
- Admin email idempotency and retry
- WhatsApp contact link
- Test transaction rejected by a production-configured deployment
- Subscription activation and expiration only after a real plan is configured

Automated checks use mocked/static transaction data and never use live credentials:

```bash
corepack yarn test:payments
corepack yarn exec tsc --noEmit
corepack yarn build
```

## Production launch checklist

- Flutterwave account and required business/KYC verification approved
- Merchant authorized for the intended West African countries and currencies
- Required card/mobile-money methods confirmed in the merchant account
- Settlement account and settlement currency configured
- Live v3 credentials stored only in Vercel Production
- Preview and development contain only v3 Test Mode credentials
- Production webhook URL and secret hash verified
- Successful live verification tested with an approved low-value transaction
- Callback, webhook retry, and reconciliation tested
- Resend production sender and administrator recipient verified
- Subscription price/duration and permissions tested before enabling subscriptions
- Proposal Review price approved and WhatsApp follow-up operational
- Test records confirmed absent from production revenue totals

Do not mark the integration live until Flutterwave account eligibility, supported payment methods/currencies, webhooks, verification, settlement, email, and fulfillment have all been validated in the actual production merchant account.