# EasyGrantPath

EasyGrantPath helps individuals, startups, NGOs, and organizations discover suitable funding opportunities and provides professional application-support services.

## Phase 2: authentication

This repository contains the project foundation plus Better Auth email/password registration, email verification, password reset, server-side route guards, and `user`/`admin` authorization.

It does **not** yet include opportunity listings or ingestion, grant matching, eligibility checking, service packages, payments, real dashboards, uploads, referrals, application workflows beyond authentication, or French translations.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- shadcn/ui-style Radix primitives and Sonner
- MongoDB, Mongoose, Better Auth, Zod
- Yarn 4 (run through Corepack where Yarn is not globally installed)

## Setup

1. Enable Corepack if needed: `corepack enable`
2. Install dependencies: `corepack yarn install`
3. Copy `.env.example` to `.env.local` and supply local values.
4. Start the app: `corepack yarn dev`

Required server-only variables:

```env
MONGODB_URI=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
SYNC_SECRET=<long-random-secret-shared-with-github-actions>
```

## Commands

- `corepack yarn dev` — development server
- `corepack yarn lint` — ESLint
- `corepack yarn tsc --noEmit` — type-check
- `corepack yarn build` — production build
- `corepack yarn start` — serve a production build
- `corepack yarn make-admin email@example.com` — promote an existing Better Auth user to administrator

## Structure

`app/` routes and route handlers; `components/` reusable UI; `lib/` infrastructure; `models/` future Mongoose models; `services/` business logic; `sources/` grant-source adapters; `jobs/` scheduled-job functions; `actions/` server actions; `types/` shared contracts; `hooks/` React hooks; and `emails/` templates.

## Phase 2 decisions

Configure a transactional email provider before production registration, verification, and password reset. In development, verification/reset URLs are logged server-side only. Choose the initial opportunity data model and source ingestion/review workflow before implementing source adapters. Confirm the MongoDB deployment topology (replica set versus standalone) before enabling auth database transactions in production.

## Opportunity ingestion

Grants.gov is the first source adapter. Its `search2` and `fetchOpportunity` public REST endpoints are called server-side; keyword searches are paginated, IDs are deduplicated, and detail requests run in batches of five. Only opportunities with deterministic West Africa/Africa relevance signals are saved, always with `verificationStatus: needs_review`. The public application must query only `verified` opportunities.

Source-controlled fields (description, deadline, funding, source timestamps, and relevance) refresh on repeat syncs. Verification state, reviewer identity, and admin notes are deliberately not overwritten. Same-source identity is the unique `source.slug + source.externalId`; a stable fingerprint is retained only to support future cross-source duplicate review.

Set `SYNC_SECRET` in the deployment environment and create these GitHub repository secrets with the same secret value:

- `SYNC_SECRET`
- `EASYGRANTPATH_SYNC_URL` (for example, `https://your-domain/api/internal/opportunities/sync`)

The `Sync opportunities` workflow runs at 06:17 and 18:17 UTC, and can be run via **Actions → Sync opportunities → Run workflow**. It makes one authenticated POST request and does not need database credentials. Admins can use the same sync service through `POST /api/admin/opportunities/sync`; pending imported records appear at `/admin/opportunities`. Inspect `SourceSyncRun` records and the source health fields in `GrantSource` to troubleshoot failures.

To test manually, authenticate as an admin and call the admin route, or call the internal route with `Authorization: Bearer <SYNC_SECRET>` and `{"source":"grants-gov"}`. Never place that secret in client code. A future ECOWAS source only needs to implement the source adapter contract (`fetch`, `normalize`, and `assessRelevance`) and be registered in `sources/shared/source-registry.ts`; the sync, review, and publishing paths remain unchanged.
"# easy-grant-path" 
