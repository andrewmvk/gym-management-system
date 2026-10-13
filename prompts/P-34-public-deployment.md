Blocked by: P-33
Covers: NFR-7
MVP: 6
Artifacts: docker/backend-entrypoint.sh (new "api-external-db" mode), apps/api/src/db/client.ts (runMigrations: a migration bug fix needed for any fresh/catch-up database, not specific to external hosting), apps/api/src/test/global-setup.ts (reuses the same fixed runMigrations instead of its own migrate() call), docs/10-deployment.md
Evidence: the rebuilt image, run in api-external-db mode against a brand-new, empty Postgres container (not the bundled one), applied all 16 migrations and seeded successfully with no code changes to the default "api"/"db-only" modes; the full Vitest suite (383 tests) still passes against the test database with the same fix

Task: make the existing backend image deployable against a free-tier managed Postgres (e.g. Neon) instead of its bundled one, and fix the migration-ordering bug that blocks any fresh or far-behind database from catching up in one run.

Context:
- NFR-7 and MVP 6 in docs/02-requirements.md and docs/07-mvp-roadmap.md (audit-log item 32): a free-tier public deployment, separate from the local Docker Compose grading environment, so P-33's PWA manifest has a real HTTPS origin.
- apps/api/Dockerfile bundles PostgreSQL inside the API container (course requirement: exactly two containers) - docker/backend-entrypoint.sh always starts a local PostgreSQL process unless told otherwise. Free hosting tiers rarely offer enough persistent disk for a real database, so the public deployment keeps the same image but points it at an external managed Postgres instead.
- While testing this against a truly fresh database, a pre-existing migration bug surfaced: migration 0010 adds a new value to the profile_event_type enum, and migration 0015 (five migrations later) deletes rows using that value. drizzle-orm's migrate() runs every pending migration in one transaction (pg-core/dialect.ts), and Postgres refuses to use an enum value in the same transaction that added it - so any database behind migration 0010, a brand-new one included, fails catching up with "unsafe use of new value". This was never caught before because no database had gone from empty (or pre-0010) straight through 0015 in one run until this prompt's testing did.

Permitted scope:
- Only the files in Artifacts, plus docs/08-traceability-matrix.md, prompts/README.md (confirmed with the developer before any doc was touched, same as P-33).
- No new npm dependencies.
- The default "api" and "db-only" entrypoint modes, and docker-compose.yml, must behave exactly as before - verified by re-running the full local stack and the full test suite, not just the new mode.

Functional requirements:
1. A new docker/backend-entrypoint.sh mode, "api-external-db": skips the local PostgreSQL bootstrap entirely (no POSTGRES_* vars required) and runs db:migrate, db:seed, then the API directly against whatever DATABASE_URL the host already provides.
2. apps/api/src/db/client.ts's runMigrations() is fixed to apply the migrations up to and including 0010 in their own pass (a temporary folder built from the real migrations/journal, never the committed files themselves) before running the rest normally, so a fresh or far-behind database never hits the enum-ordering conflict. This fixes the bug for every caller (docker compose up's default mode, the test database, and the new external-db mode alike), not just the new mode.
3. apps/api/src/test/global-setup.ts stops hand-rolling its own migrate() call and goes through the same runMigrations(), so the test database gets the fix too instead of silently diverging from the app's own migration path.
4. docs/10-deployment.md documents the concrete steps and environment variables for Vercel (frontend), Render (API, using the new mode), and Neon (database) - the three services checked to have a genuinely free tier as of this prompt's date.

Acceptance criteria:
- Running the rebuilt image in api-external-db mode against a brand-new, completely empty Postgres container applies all 16 migrations and the seed with no error.
- docker compose up (the default "api" mode) and the full Vitest suite are unaffected - same behavior, same pass count, as before this prompt.
- No change to any file outside Artifacts.

Tests:
- No automated test exercises the entrypoint script itself (it's shell, run only inside a container) - verified manually: a throwaway plain postgres:17 container plus the rebuilt image in api-external-db mode, confirmed via psql that all 16 migrations and the seeded accounts landed, then cleaned up both containers.
- The existing Vitest suite is the regression check for the client.ts/global-setup.ts fix: run in full (383 tests), since the fix changes a shared code path every test file's setup depends on.

Final response:
- Files changed: docker/backend-entrypoint.sh (new mode), apps/api/src/db/client.ts (two-phase migration fix), apps/api/src/test/global-setup.ts (reuse the fix instead of a second migrate() call), docs/10-deployment.md (new).
- Tests run: full Vitest suite, 383/383 passing; apps/api and apps/web typecheck clean.
- Verified manually: a truly fresh Postgres container, migrated and seeded successfully in the new mode; the normal local docker compose stack still starts and seeds correctly afterward, unaffected.
- Pending: actually creating the Vercel/Render/Neon accounts and deploying (the developer's own step - see docs/10-deployment.md); P-33's PWA installability can only be checked on a real phone once that's done.
