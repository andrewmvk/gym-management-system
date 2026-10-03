Blocked by: P-14, P-20
Covers: FR-36, FR-40
MVP: 4
Artifacts: apps/api/src/modules/metrics/{router,service,repository}.ts (new domain module), packages/shared/src/schemas/metrics.ts, member listing in apps/api/src/modules/auth/, apps/web/src/app/(member)/metrics/, apps/web/src/app/(staff)/members/, apps/web/src/components/{date-range-picker,calendar,app-header}.tsx, apps/web/src/lib/navigation.ts
Evidence: Vitest against Postgres: for a known data set the metrics are exact, days trained ignore days with only completed exercises and no check-in, and a retroactive correction is reflected; manual: both pages render

Task: implement the member's personal metrics and the mocked membership status views.

Context:
- FR-36 and FR-40 in docs/02-requirements.md and the metrics section of docs/05-data-model.md. "Days trained" and training frequency count distinct local calendar days with at least one f_check_ins row, and only that. Exercise breakdown, volume and goal progress come from the plan tables and reflect retroactive corrections (RN-07).
- Membership status is a mocked field on d_users with no billing behind it.
- The metrics module is new: add "metrics" to the domain list in rules/backend.md and tell the developer, per AGENTS.md "Keeping docs in sync".
- Local-day logic reuses lib/dates.ts (P-14). Check-ins come from P-20.

Permitted scope:
- Only the files in Artifacts and the router registrations. No new dependencies.
- The seed's demo member (student@example.com, from the P-02 seed) is the account to check the member pages with.

Functional requirements:
1. metrics.mine({ from, to }), requiring read_own_metrics: trainingFrequency (check-in days per week), daysTrained, exerciseBreakdown (completed exercises per exercise, and the muscle load of the completed exercises since P-29 replaced the per-muscle-group count), trainingVolume (sum of sets times reps for completed exercises), and goalProgress (share of planned exercises completed plus the member's goals text). Everything is computed by queries, nothing is stored.
2. auth.listMembers guarded by read_members: each activated member (an account with a membership_status, so applicants are left out) with membership_status, membership_plan and aptitude_status, never an embedding or a photo path. auth.me already returns the member's own membership fields (P-03).
3. Pages: (member)/metrics with a single date range picker (a popover with presets for today, last 7 and 30 days, this month, last 3 and 6 months, this year and last 12 months, plus a calendar for a custom first and last day, built by adding range highlighting to the existing Calendar so no dependency is added), a summary strip, a breakdown table by exercise and a muscle heat map (P-29), the member's goals, and an empty state; (staff)/members with the searchable, filterable membership table. A membership badge appears in the member header bar (and in the account menu).

Acceptance criteria:
- Metrics match a hand-computed data set exactly.
- A day with completed exercises but no check-in does not count as trained.
- A member reads only their own metrics; a non-admin cannot list members.

Tests:
- Vitest against the test database with seeded rows. Pages are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
