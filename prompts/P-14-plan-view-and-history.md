Blocked by: P-13
Covers: FR-20
MVP: 2
Artifacts: plan view procedures in apps/api/src/modules/plans/, apps/api/src/lib/dates.ts, apps/web/src/app/(member)/plan/
Evidence: Vitest against Postgres: a member reads only their own plans, marking an exercise works, the local-day helper is correct at midnight boundaries; manual: today's plan, history, and the empty state work on a phone

Task: implement the member's view of today's plan, the history by date, and marking exercises as completed.

Context:
- FR-20 in docs/02-requirements.md and the daily plan flow in docs/03-features-and-flows.md (flow 4). An exercise is performable only if it needs no equipment or at least one linked item is available (FR-17), using the predicate from P-06.
- All "today" and date logic uses the server's local timezone, with no per-user timezone (FR-39). Put that in one helper so later prompts reuse it.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.
- Don't build trainer review or chat.

Functional requirements:
1. lib/dates.ts with todayLocal() and helpers for local-day boundaries that accept an injected clock for tests.
2. Procedures, all limited to the signed-in member through the ability: plans.getToday, plans.getByDate({ date }), plans.listDates({ from, to }) and plans.markExerciseCompleted({ planExerciseId, completed }). Every exercise in a response carries isPerformable, computed at read time.
3. Page (member)/plan: today's plan with sets, reps, load and instructions; a completion checkbox with an optimistic update; unavailable exercises shown as disabled with an explanation; a badge when the plan status is trainer_edited; a history browser by date (read-only for past dates); an empty state with a button that calls plans.generateToday; skeleton loading (a per-page skeleton inside GuardedContent, built from components' .Skeleton; rules/frontend.md "Loading states") and explicit error states; usable on a phone.

Acceptance criteria:
- A member cannot read or change another member's plan.
- isPerformable follows the availability rule when equipment is toggled.
- The local-day helper gives the right day just before and just after midnight.

Tests:
- Vitest against the test database for the criteria above. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
