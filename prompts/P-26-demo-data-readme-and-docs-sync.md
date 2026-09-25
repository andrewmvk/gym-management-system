Blocked by: all other prompts
Covers: the demo data described in docs/04-architecture.md §8, and the "Keeping docs in sync" rule in AGENTS.md
MVP: 5
Artifacts: apps/api/src/db/seed-demo.ts, package script db:seed:demo, README.md, updated docs/, PRODUCT.md and rules/ where they drifted, completed docs/08-traceability-matrix.md
Evidence: docker compose up plus the seeds gives a demo with non-zero occupancy and demand; a fresh clone follows the README to a running system; the matrix has a real result for every prompt

Task: add the demo data, write the README, and bring the documentation back in sync with what was built.

Context:
- docs/04-architecture.md §8 (fake members, check-ins and plans so occupancy and demand show realistic numbers), AGENTS.md "Keeping docs in sync", and docs/08-traceability-matrix.md.
- The demo data must be clearly fake: no real people and no real biometric data (docs/01-product-overview.md). Embeddings come from the deterministic stub.

Permitted scope:
- Only the files in Artifacts. No new dependencies.
- For the documentation sync: first list every doc or rule that now disagrees with the code and why, tell the developer, and edit only after approval (AGENTS.md).

Functional requirements:
1. seedDemo(): about 25 fake cleared members (fixed e-mails like demo1@example.com) with member policies and a mix of active and inactive membership; an onboarding submission each; plans for the last 21 days plus today with some exercises completed; check-ins over the last 21 days with peaks between 06:00 and 08:00 and between 17:00 and 20:00, plus a few in the last 90 minutes relative to the run time; a few trainer_edited plans with review notes; and certificate rows in the admin queue covering every result including pending_retry. It is idempotent and replaces only its own rows.
2. README.md: what Cadence is, prerequisites, how to run with docker compose up and with pnpm dev (database via pnpm db:up), migrations and seeds, db:studio and db:reset, the demo credentials, an environment variable table, how to run the tests, the folder map, and links to prompts/README.md and docs/.
3. Documentation sync as described above, and fill the "Generated artifact" and "Test/evidence" results in docs/08-traceability-matrix.md for every prompt.

Acceptance criteria:
- Running the seed twice keeps the same counts, and the gym info page shows a non-zero occupancy right after seeding.
- Following only the README from a fresh clone produces a running system.
- No doc contradicts the code after the sync.

Tests:
- Vitest for seed idempotency and the recent check-ins. The README is validated by following it on a clean checkout.

Final response:
- Respond in at most 10 lines with files created, tests run, the docs that drifted, and pending items.
