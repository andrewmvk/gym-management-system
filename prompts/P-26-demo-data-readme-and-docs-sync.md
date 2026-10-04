Blocked by: all other prompts
Covers: the demo data described in docs/04-architecture.md §8, and the "Keeping docs in sync" rule in AGENTS.md
MVP: 5
Artifacts: apps/api/src/db/seed-demo.ts, apps/api/src/db/seed-demo.test.ts, apps/api/src/db/cli.ts (seed:demo command), package script db:seed:demo (root and apps/api), README.md, updated docs/, PRODUCT.md, DESIGN.md and rules/ where they drifted (last synced on 2026-10-04, audit-log items 20 and 21), completed docs/08-traceability-matrix.md
Evidence: Vitest: the seed keeps the same counts when run twice, builds the members (a mix of active and lapsed), the plans, the upcoming plans and the trainer notes, remembers the facts (one resolved), keeps a lapsed member out of the history after the lapse, leaves a non-zero occupancy and a non-empty Today's demand on the staff Overview; docker compose up plus the seeds gives a demo with non-zero occupancy and demand; a fresh clone follows the README to a running system; the matrix has a real result for every prompt
Status: Partly superseded by P-31 (audit-log item 20): the demo has no applicants and no certificates, because accepting a person happens in person at the gym and leaves no record in the system; every demo member has completed registration. The code and its tests still seed four demo applicants and their certificate rows until P-31 is executed

Task: add the demo data, write the README, and bring the documentation back in sync with what was built.

Context:
- docs/04-architecture.md §8 (fake members, check-ins and plans so occupancy and demand show realistic numbers), AGENTS.md "Keeping docs in sync", and docs/08-traceability-matrix.md.
- The demo data must be clearly fake: no real people and no real biometric data (docs/01-product-overview.md). Embeddings come from the deterministic stub.
- The seed builds on the base seed (P-02, P-23): the policy catalog and the group policy lists are re-asserted there on every run, so the demo members join the `member` group and hold exactly what the catalog gives it (including `manage_own_profile_events`), and the demo needs no policy rows of its own.

Permitted scope:
- Only the files in Artifacts. No new dependencies.
- For the documentation sync: first list every doc or rule that now disagrees with the code and why, tell the developer, and edit only after approval (AGENTS.md).

Functional requirements:
1. seedDemo(): 25 fake members (fixed e-mails demo1@example.com to demo25@example.com) in the `member` policy group (FR-47), of whom every fifth is a lapsed member: inactive membership, last seen about 10 days ago (DEMO_LAPSE_DAYS_AGO), so they cannot log in or check in (FR-40) and the staff Member page shows a history that stops at the lapse; the others are active. An onboarding submission each; plans for the last 21 days plus today with some exercises completed (a lapsed member has none after the lapse); a plan for tomorrow, with nothing ticked, for two members (the "Other days" tab and the upcoming list); check-ins over the last 21 days with peaks between 06:00 and 08:00 and between 17:00 and 20:00, plus a few distinct members in the last 90 minutes relative to the run time; a few trainer_edited plans with review notes; trainer notes on two members' plans for today (an injury and a medication change), which the AI reads when it rebuilds those plans and which the member sees on Home (FR-19); and remembered facts across several members, one of them already marked no longer true (FR-58), each with the message it came from. It is idempotent and replaces only its own rows. Until P-31 it also seeds four demo applicants with certificate rows covering every result including pending_retry; P-31 removes them, and no demo account is ever an applicant.
2. README.md: what Cadence is, prerequisites, how to run with docker compose up and with pnpm dev (database via pnpm db:up), migrations and seeds, db:studio and db:reset, the demo credentials (including which demo members are lapsed and cannot log in until an admin reactivates them), an environment variable table, how to run the tests, the folder map, and links to prompts/README.md and docs/.
3. Documentation sync as described above, and fill the "Generated artifact" and "Test/evidence" results in docs/08-traceability-matrix.md for every prompt. The sync of 2026-10-04 covers the in-person registration target (audit-log item 20, executed by P-31) and what the critique built (audit-log item 21); the only places that mention the gap between docs and code are docs/07-mvp-roadmap.md, docs/08-traceability-matrix.md, docs/09-audit-log.md and prompts/.

Acceptance criteria:
- Running the seed twice keeps the same counts, and the gym info page shows a non-zero occupancy right after seeding.
- The staff Overview shows plans dated today, muscles trained and equipment needed right after seeding.
- Following only the README from a fresh clone produces a running system.
- No doc contradicts the code after the sync, apart from the target of P-31 that the docs name explicitly.

Tests:
- Vitest for seed idempotency, the recent check-ins, the lapsed members, the upcoming plans, the trainer notes and the remembered facts. The README is validated by following it on a clean checkout.

Final response:
- Respond in at most 10 lines with files created, tests run, the docs that drifted, and pending items.
