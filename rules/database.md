# Database (Drizzle + PostgreSQL)

Schema lives in `apps/api/src/db/schema/`, one file per table group (e.g. `users.ts`, `policies.ts`, `plans.ts`, `catalog.ts`), matching the entities in `docs/05-data-model.md` exactly - that document is the source of truth for columns/types/enums; don't add or rename a column without updating it there too.

## Conventions

- Table names are `d_`/`f_`-prefixed per `rules/naming-conventions.md`; column names plain `snake_case` in Postgres; `camelCase` TS property with an explicit column mapping.
- Every table: `uuid` primary key, `created_at timestamp` unless the table's entry in `docs/05-data-model.md` omits it deliberately. **One exception**: `d_user_policy.id` is a human-readable `text` slug (e.g. `manage_onboarding`), not a `uuid` - it's referenced directly as a stable identifier in code (`packages/shared/src/auth/constants/policies.ts`).
- Enums are real Postgres enums (`aptitude_status`, `ai_result`, `turnstile_status`, `f_user_policy_on_user.effect`, etc.) matching the doc's value sets exactly - don't loosen one to plain `text`. The exception is `d_user_policy.operation`/`.resource`/`.scope`, deliberately plain `text`: their vocabulary is owned by the shared TS types in `packages/shared/src/auth/types.ts`, not a Postgres enum, so a new policy recombining existing actions/resources is a seed insert, never a migration.
- `jsonb` columns (`answers`, `payload`, `field_mapping`, `medications`, etc.) are always paired with a zod schema in code that validates the shape on read and write - Postgres won't enforce their internal structure.
- There is no `role` column anywhere. `d_users` is one table for every person (member, trainer, admin); what they can do comes entirely from `d_user_policy`/`f_user_policy_on_user` (see `rules/backend.md` and `docs/04-architecture.md` §11).

## Add-only and singleton tables

- `d_exercises` is add-only: no delete mutation exists anywhere, for anyone. Enforce this by never defining a `delete` procedure for it, not just by convention (FR-24).
- `d_user_policy` is add-mostly: don't delete a policy once any `f_user_policy_on_user` row references it - revoke the grant (update `expires_on`) instead, the same way `f_training_plan_exercises` handles corrections in place rather than through deletion.
- `d_turnstile_config` and `d_gym_settings` are effectively singleton rows: access them through a dedicated `getOrCreate`/upsert-by-known-id repository method, never a naive `findMany` that assumes one row will always exist.

## Migrations

Every schema change goes through `drizzle-kit generate`, producing a committed migration file - never a manual `ALTER TABLE` applied outside that flow. The seed script (`apps/api/src/db/seed.ts`) is the only code path that creates the fixed demo trainer/admin `d_users` rows and grants their policies (FR-41); keep it safe to re-run in local dev without duplicating the fixed demo accounts, the policy catalog, or the exercise/equipment catalog.

## Local databases

There is no shared hosted database. Each developer runs PostgreSQL inside their own `backend` container (`pnpm db:up` starts only the database for `pnpm dev`; `docker compose up` runs the full stack). The port is published on `127.0.0.1` only. The same instance holds a separate test database for `TEST_DATABASE_URL`, so tests never touch dev data.

- `pnpm db:studio` opens Drizzle Studio in the browser to inspect and edit the local database.
- `pnpm db:reset` wipes the local database, migrates and seeds. Use it after switching to a git branch whose migrations don't match your local schema. Shared demo data comes from the seeds, never from copying someone's database.

## Retroactive corrections and mutable facts

`f_training_plan_exercises` rows for a past date are updated directly, in place - there is no versioned/append-only history for this table (FR-23). `f_user_policy_on_user` works the same way: revoking or extending a grant updates its `expires_on` in place. Don't turn either into an append-only event log - a fact table in this schema is about grain and change-frequency, not immutability (`rules/naming-conventions.md`).
