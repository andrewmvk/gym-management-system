Blocked by: P-14, P-20
Covers: FR-36, FR-40
MVP: 4
Artifacts: apps/api/src/modules/metrics/{router,service,repository}.ts (new domain module), member listing in apps/api/src/modules/auth/, apps/web/src/app/(member)/metrics/, apps/web/src/app/(staff)/members/
Evidence: Vitest against Postgres: for a known data set the metrics are exact, days trained ignore days with only completed exercises and no check-in, and a retroactive correction is reflected; manual: both pages render

Task: implement the member's personal metrics and the mocked membership status views.

Context:
- FR-36 and FR-40 in docs/02-requirements.md and the metrics section of docs/05-data-model.md. "Days trained" and training frequency count distinct local calendar days with at least one f_check_ins row, and only that. Exercise breakdown, volume and goal progress come from the plan tables and reflect retroactive corrections (RN-07).
- Membership status is a mocked field on d_users with no billing behind it.
- The metrics module is new: add "metrics" to the domain list in rules/backend.md and tell the developer, per AGENTS.md "Keeping docs in sync".
- Local-day logic reuses lib/dates.ts (P-14). Check-ins come from P-20.

Permitted scope:
- Only the files in Artifacts and the router registrations. No new dependencies.

Functional requirements:
1. metrics.mine({ from, to }), requiring read_own_metrics: trainingFrequency (check-in days per week), daysTrained, exerciseBreakdown (completed exercises per exercise and per muscle group), trainingVolume (sum of sets times reps for completed exercises), and goalProgress (share of planned exercises completed plus the member's goals text). Everything is computed by queries, nothing is stored.
2. auth.listMembers guarded by read_members: each member with membership_status, membership_plan and aptitude_status, never an embedding or a photo path. auth.me already returns the member's own membership fields (P-03).
3. Pages: (member)/metrics with a date range, summary cards, a breakdown table, and an empty state; (staff)/members with the membership table. A membership badge appears in the member header.

Acceptance criteria:
- Metrics match a hand-computed data set exactly.
- A day with completed exercises but no check-in does not count as trained.
- A member reads only their own metrics; a non-admin cannot list members.

Tests:
- Vitest against the test database with seeded rows. Pages are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
