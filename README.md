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
"# easy-grant-path" 
