# Cadence - AI Gym Management System - Agent Instructions

Academic project (not deployed to real users) replacing a gym's fingerprint access control and manual trainer interviews with face-recognition check-in and an AI that builds/refines training plans from accumulated structured facts, not a single interview. Full product context: [`PRODUCT.md`](./PRODUCT.md). Full functional/technical detail: [`docs/`](./docs/) (`01-product-overview.md`, `02-requirements.md` with FR-1..FR-44, `03-features-and-flows.md`, `04-architecture.md`, `05-data-model.md`).

This file is the always-loaded index. It stays short by design - code-level conventions live in `rules/`, linked below. Don't duplicate FR/architecture detail here; link to `docs/` instead.

## Stack

Next.js (TS) + Tailwind + shadcn/ui frontend · Node/Express + tRPC backend · Drizzle + PostgreSQL · custom JWT (httpOnly cookie) · OpenRouter for all AI calls · Resend for email · face-api.js-style face recognition (backend for the signup embedding, browser at the kiosk) · Docker Compose with two containers (`frontend`, and `backend` running the API plus PostgreSQL).

## Repo layout

```
apps/web/        Next.js frontend (member, trainer, admin, and kiosk routes)
apps/api/         Express + tRPC backend
packages/shared/  Shared tRPC AppRouter type, zod schemas, CASL ability builder (`src/auth/`), shared TS types
docs/             Product/requirements/architecture/data-model docs (source of truth for scope)
rules/            Code-level conventions for AI agents - see table below
```

## Non-negotiable product principles

Every change should respect these (from `PRODUCT.md`):

1. **AI acts, humans oversee asynchronously** - plans publish immediately; trainer review never blocks publication.
2. **History over interviews** - future plans reason from accumulated structured facts (`f_profile_events`), never the raw chat transcript.
3. **Minimize biometric exposure at each trust boundary** - only the backend ever sees raw reference photos; only embeddings reach the kiosk.
4. **Distinguish technical failure from a real determination** - an AI/turnstile failure is always its own state (`pending_retry`, `failed`), never coalesced into a real clinical or access decision.
5. **Scope matches an academic, single-location demo** - no multi-tenancy, no production hardening, no payment processing. Don't gold-plate beyond `docs/02-requirements.md`.

## Rules index

| File | Read it when you're... |
|---|---|
| [`rules/naming-conventions.md`](./rules/naming-conventions.md) | naming a file, component, variable, tRPC procedure, or branch/commit |
| [`rules/error-handling.md`](./rules/error-handling.md) | handling an AI/turnstile failure, validation error, or surfacing an error to the UI |
| [`rules/frontend.md`](./rules/frontend.md) | writing anything in `apps/web` - data fetching, forms, styling, routing |
| [`rules/backend.md`](./rules/backend.md) | writing anything in `apps/api` - routers, services, AI calls, auth, uploads |
| [`rules/database.md`](./rules/database.md) | touching Drizzle schema, migrations, or seed data |
| [`rules/testing.md`](./rules/testing.md) | deciding whether/how to test something |
| [`rules/git-conventions.md`](./rules/git-conventions.md) | branching or writing a commit message |
| [`rules/code-comments.md`](./rules/code-comments.md) | always - writing any code |
| [`rules/response-language.md`](./rules/response-language.md) | always - every response |
| [`rules/punctuation.md`](./rules/punctuation.md) | always - writing any text |

## Keeping docs in sync

`docs/`, `PRODUCT.md`, and the `rules/*.md` files describe the current, agreed-upon shape of this project - treat drift between them and the code as a bug, not a detail to skip. Whenever a change touches scope, the data model, a user-facing flow, or an architecture decision:

1. Check whether it's still consistent with `docs/`, `PRODUCT.md`, and the relevant `rules/*.md` file.
2. If it isn't, tell the developer which doc(s) are now out of date and why - before writing any doc changes.
3. Only update the docs after the developer approves. Don't let them silently drift out of sync, and don't rewrite them speculatively without confirmation first.

## Before you start

- Don't invent scope beyond FR-1..FR-44 (`docs/02-requirements.md`) - the "Out of Scope" list there is deliberate, not an oversight.
- No code exists yet at the time this file was written - when scaffolding the repo, follow the layout above rather than improvising a different structure.
