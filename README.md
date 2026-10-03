# Cadence

Cadence is an academic gym management system. It replaces a gym's fingerprint access control and manual trainer interviews with face-recognition check-in, and with an AI that builds and refines each member's training plan from accumulated structured facts instead of a single interview. It is a single-location demo, not a production system.

Product context lives in [`PRODUCT.md`](./PRODUCT.md), the functional and technical detail in [`docs/`](./docs/), and the prompt plan that built the code in [`prompts/README.md`](./prompts/README.md).

## Prerequisites

- Node.js 22 or newer
- pnpm (the version pinned in `package.json`, for example through `corepack enable`)
- Docker with Docker Compose
- Always use `pnpm`, never `npm`, `npx` or `yarn`

## Setup

```bash
pnpm install
cp .env.example .env
```

Fill the blanks in `.env`: `POSTGRES_PASSWORD` (and the same password inside `DATABASE_URL` and `TEST_DATABASE_URL`), the three `SEED_*_PASSWORD` values (8 characters or more), `JWT_SECRET` (32 characters or more) and `KIOSK_API_KEY` (16 characters or more). For a run without network access or an OpenRouter key, set `AI_MODE=mock`.

## Run with Docker Compose

```bash
docker compose up --build
```

This starts two containers: `frontend` (http://localhost:3000) and `backend` (the API on http://localhost:4000 plus PostgreSQL). On every boot the backend applies the migrations and the base seed (policies, groups, staff accounts, the demo student and the exercise catalog).

Then load the demo data (fake members, check-ins and plans):

```bash
docker compose exec backend pnpm run db:seed:demo
```

## Run with pnpm dev

```bash
pnpm db:up      # PostgreSQL in a container on 127.0.0.1:5432
pnpm db:migrate
pnpm db:seed
pnpm db:seed:demo
pnpm dev        # web on :3000 and api on :4000
```

`pnpm db:down` stops the database.

## Database commands

| Command | What it does |
|---|---|
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Base seed: policies, groups, staff accounts, the demo student, the catalog. Idempotent |
| `pnpm db:seed:demo` | Runs the base seed, then the demo data. Idempotent, it only replaces its own rows |
| `pnpm db:reset` | Drop and recreate the schema, then migrate and seed (refuses to run in production) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:generate` | Generate a migration from schema changes |

The demo data is fake: members `demo1@example.com` to `demo25@example.com` (every fifth one has an inactive membership), four certificate applicants `demo-applicant1@example.com` to `demo-applicant4@example.com`, 21 days of check-ins and plans, and a few check-ins in the last 90 minutes. The embeddings come from the deterministic stub and there are no reference photos. The recent check-ins age out of the occupancy window after 90 minutes, so run `pnpm db:seed:demo` again before a demo.

## Demo credentials

The passwords are the ones you set in `.env`.

| Account | E-mail | Password variable |
|---|---|---|
| Trainer | `trainer@example.com` | `SEED_TRAINER_PASSWORD` |
| Admin | `admin@example.com` | `SEED_ADMIN_PASSWORD` |
| Student (member) | `student@example.com` | `SEED_STUDENT_PASSWORD` |
| Demo members | `demo1@example.com` to `demo25@example.com` | `SEED_STUDENT_PASSWORD` |

## Environment variables

Set in `.env` (see [`.env.example`](./.env.example)). The API stops at boot and names any missing or invalid one.

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials and name of the PostgreSQL database the backend container creates |
| `DATABASE_URL` | Connection string for host processes (`pnpm dev`, seeds, Drizzle Studio) |
| `TEST_DATABASE_URL` | Separate database the tests truncate freely |
| `SEED_TRAINER_PASSWORD` / `SEED_ADMIN_PASSWORD` / `SEED_STUDENT_PASSWORD` | Passwords of the seeded demo accounts |
| `NODE_ENV` | `production` turns on the `Secure` cookie flag |
| `API_PORT` | API port (default 4000) |
| `WEB_ORIGIN` | Web app URL: the CORS origin and the base of e-mail links |
| `JWT_SECRET` | Signing secret of the auth JWT |
| `KIOSK_API_KEY` | Authenticates the kiosk's fetch of the face embeddings |
| `UPLOADS_DIR` | Where uploaded files are stored |
| `AI_MODE` | `live` calls OpenRouter, `mock` returns fixtures without network |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | Required when `AI_MODE` is `live` |
| `AI_MOCK_APTITUDE` / `AI_MOCK_CERTIFICATE` | Mock verdict: `cleared`, `not_cleared` or `unavailable` |
| `PLAN_GENERATOR` | `ai` or `placeholder` (defaults to `placeholder` in mock mode) |
| `EMAIL_MODE` | `resend` sends e-mail, `log` writes it to the API log |
| `RESEND_API_KEY` / `EMAIL_FROM` | Resend credentials and sender (key required when `EMAIL_MODE` is `resend`) |
| `FACE_EMBEDDING_MODE` | `stub` (deterministic) or `real` (face-api.js model) |
| `NEXT_PUBLIC_API_URL` | Backend base URL used by the web app |

## Tests and checks

```bash
pnpm db:up   # the API tests need the test database
pnpm fix     # Biome lint and format with auto-fix
pnpm types   # type check
pnpm test    # Vitest in every workspace
```

Run one file with `pnpm --filter @cadence/api exec vitest run path/to/test.spec.ts`. `pnpm check` runs Biome without changing files.

## Folder map

```
apps/web/         Next.js frontend (member, trainer, admin and kiosk routes)
apps/api/         Express + tRPC backend, Drizzle schema, migrations and seeds
packages/shared/  Shared zod schemas, CASL abilities, face models
docs/             Requirements, flows, architecture, data model, traceability
prompts/          The prompt plan, one file per piece of work
rules/            Code-level conventions
docker/           Backend container entrypoint
```
