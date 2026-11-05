# Flutterwave payments

EasyGrantPath uses Flutterwave Standard v3 hosted checkout. The browser receives only the hosted checkout URL. Checkout initialization, provider verification, payment fulfillment, and paid-request creation run on the server.

Official references:

- [Flutterwave Standard](https://developer.flutterwave.com/docs/flutterwave-standard-1)
- [Transaction verification](https://developer.flutterwave.com/docs/transaction-verification)
- [Webhooks](https://developer.flutterwave.com/docs/webhooks)
- [Official test payment methods](https://developer.flutterwave.com/docs/testing)

## Environment selection

The server chooses payment mode; requests and browser code cannot override it.

| Deployment | Mode | Required secret key |
| --- | --- | --- |
| Local development (`NODE_ENV=development`) | Test | `FLWSECK_TEST-...` |
| Vercel Preview (`VERCEL_ENV=preview`) | Test | `FLWSECK_TEST-...` |
| Vercel Production (`VERCEL_ENV=production`) | Live | `FLWSECK-...` without `_TEST` |
| Other production runtime | Live | Live key |

A key in the wrong mode disables checkout. Production never falls back to a test key, and local/preview environments never accept a live key.

## Required server configuration

All prices are minor currency units and are read only on the server. A product is unavailable until every setting listed for it is valid; there are no code defaults or client-supplied amounts.

```env
FLW_SECRET_KEY=FLWSECK_TEST-...
FLW_WEBHOOK_SECRET=<at-least-16-random-characters>
NEXT_PUBLIC_APP_URL=http://localhost:3000

PLATFORM_ACCESS_PRICE_MINOR=<approved-price>
PLATFORM_ACCESS_CURRENCY=<ISO-4217-currency>
PLATFORM_ACCESS_DURATION_DAYS=<positive-integer>

PROPOSAL_WRITING_PRICE_MINOR=<approved-price>
PROPOSAL_WRITING_CURRENCY=<ISO-4217-currency>
PROPOSAL_REVIEW_PRICE_MINOR=<approved-price>
PROPOSAL_REVIEW_CURRENCY=<ISO-4217-currency>

ADMIN_NOTIFICATION_EMAIL=support@example.com
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=EasyGrantPath <payments@verified-domain.example>
```

The public Flutterwave key is optional because Standard checkout is initialized server-side. Never put the secret key or webhook secret in a `NEXT_PUBLIC_` variable.

## Products and fulfillment

### Platform access

A verified `platform_access` payment extends the customer’s access from the current future expiry, or from payment verification if access has lapsed. It does not create recurring billing. Logged-in users retain their account dashboard, payments, settings, and assistance pages even after access expires; premium opportunity features remain separately restricted.

### Proposal Writing and Proposal Review

Proposal Writing and Proposal Review are separate, fixed-price services. Checkout captures a WhatsApp number; saving it to the profile is opt-in. A server-verified payment creates one paid service request, sends a retry-safe Resend notification to the configured admin address, and appears in the pending admin service-request queue. The customer sees **Payment received. We will contact you on WhatsApp.**

No proposal file or editor link is required. All writing and review work occurs outside EasyGrantPath through WhatsApp. Administrators use the corresponding contact link; the prefilled message identifies the paid writing or review request.

## Local testing and webhooks

Use Flutterwave Test Mode locally and only official Flutterwave test payment methods. Flutterwave needs a public HTTPS webhook URL, such as a temporary approved tunnel:

```text
https://your-temporary-host.example/api/webhooks/flutterwave
```

Set the Flutterwave dashboard secret hash to the exact `FLW_WEBHOOK_SECRET`, enable retries, and set `NEXT_PUBLIC_APP_URL` to the same origin. Do not expose a development tunnel using live credentials.

The callback and webhook both re-query Flutterwave. They do not grant access or create a paid request from redirect or webhook data alone. Duplicate callbacks and webhooks are safe through unique payment references, provider transaction IDs, webhook-event keys, and fulfilled service-request references.

## Reconciliation and operations

Customers can revisit `/dashboard/payments` and retry a callback verification. Administrators can use **Payments → Reconcile pending** to verify recent pending records from the Flutterwave API. Provider timeout/unavailability leaves an attempt pending for later reconciliation rather than treating it as a verified payment.

Common failures:

- **Checkout unavailable:** verify payment-mode credentials, webhook secret, public origin, all product values, Resend, and admin email.
- **401 webhook:** Flutterwave’s dashboard secret hash and `FLW_WEBHOOK_SECRET` differ.
- **Verification mismatch:** reference, amount, currency, email, metadata, environment, or transaction ID differs. Investigate in Flutterwave before any manual action.
- **No admin email:** inspect the service request notification status, Resend sender domain, and retry action.

## Verification commands

```bash
corepack yarn test:payments
corepack yarn exec tsc --noEmit
corepack yarn build
```

Before live launch, validate a low-value transaction with the production merchant account, configured settlement, production webhook, verified Resend sender, callback retry, webhook retry, and pending-payment reconciliation. Confirm the approved local currencies and payment methods with Flutterwave for the actual merchant account.
