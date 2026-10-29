# EasyGrantPath

EasyGrantPath helps individuals, startups, NGOs, and organizations discover suitable funding opportunities and provides professional application-support services.

## Current development phase

This repository contains the project foundation, Grants.gov ingestion, MongoDB opportunity storage, and an admin opportunity-review workflow.

User and administrator authentication are intentionally deferred until a later, dedicated development phase. Core platform features should be implemented without adding login, registration, sessions, role guards, protected admin routes, or a replacement authentication system unless explicitly requested.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- shadcn/ui-style Radix primitives and Sonner
- MongoDB, Mongoose, Zod
- Yarn 4 (run through Corepack where Yarn is not globally installed)

## Setup

1. Enable Corepack if needed: `corepack enable`
2. Install dependencies: `corepack yarn install`
3. Copy `.env.example` to `.env.local` and supply local values.
4. Start the app: `corepack yarn dev`

Required server-only variables:

```env
MONGODB_URI=
SYNC_SECRET=<long-random-secret-shared-with-github-actions>
GRANTS_GOV_BASE_URL=https://api.grants.gov # optional
```

## Commands

- `corepack yarn dev` — development server
- `corepack yarn lint` — ESLint
- `corepack yarn tsc --noEmit` — type-check
- `corepack yarn build` — production build
- `corepack yarn start` — serve a production build

## Structure

`app/` contains routes and route handlers; `components/` reusable UI; `lib/` infrastructure; `models/` Mongoose models; `services/` business logic; `sources/` grant-source adapters; `jobs/` scheduled-job functions; and `types/` shared contracts.

## Authentication

User and administrator authentication are intentionally postponed until the final development phase. During development, `/admin`, `/admin/opportunities`, and the admin management API routes are accessible without user authentication.

> **Development security warning:** Do not expose the unauthenticated admin dashboard publicly in an environment containing sensitive or production data.

The `SYNC_SECRET` bearer-token check on `/api/internal/opportunities/sync` remains enabled. It is machine-to-machine protection for the GitHub Actions ingestion request and is separate from deferred user authentication.

## Opportunity ingestion

Grants.gov is the first source adapter. Its `search2` and `fetchOpportunity` public REST endpoints are called server-side; keyword searches are paginated, IDs are deduplicated, and detail requests run in batches of five. Only opportunities with deterministic West Africa/Africa relevance signals are saved, always with `verificationStatus: needs_review`. The public application must query only `verified` opportunities.

Source-controlled fields such as description, deadline, funding, source timestamps, and relevance refresh on repeat syncs. Verification state, reviewer identity, and admin notes are deliberately not overwritten. Same-source identity is the unique `source.slug + source.externalId`; a stable fingerprint is retained only to support future cross-source duplicate review.

Set `SYNC_SECRET` in the deployment environment and create these GitHub repository secrets with the same secret value:

- `SYNC_SECRET`
- `EASYGRANTPATH_SYNC_URL` (for example, `https://your-domain/api/internal/opportunities/sync`)

The `Sync opportunities` workflow runs at 06:17 and 18:17 UTC and can also be run manually from GitHub Actions. It makes one authenticated POST request and does not need database credentials. The internal route rejects requests that do not carry the matching bearer secret.

During development, the open admin sync route delegates to the same ingestion service. Pending imported records appear at `/admin/opportunities`. Inspect `SourceSyncRun` records and the source health fields in `GrantSource` to troubleshoot failures.

To test manually, call the admin sync route directly, or call the protected internal route with `Authorization: Bearer <SYNC_SECRET>` and `{"source":"grants-gov"}`. Never place that secret in client code. A future source only needs to implement the source adapter contract (`fetch`, `normalize`, and `assessRelevance`) and be registered in `sources/shared/source-registry.ts`; the sync, review, and publishing paths remain unchanged.
