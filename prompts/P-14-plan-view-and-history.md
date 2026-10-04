Blocked by: P-13
Covers: FR-20, FR-59 (d: upcoming plans), the member side of FR-19 (the trainer notes on the plan), RN-17
MVP: 2
Artifacts: plan view procedures in apps/api/src/modules/plans/ (including plans.listUpcoming and the trainerNotes of the plan view), apps/api/src/lib/dates.ts, apps/web/src/app/(member)/plan/ (today-plan, plan-history for the Other days tab, trainer-notes)
Evidence: Vitest against Postgres: a member reads only their own plans, marking an exercise works, a future plan can be fetched by date and listUpcoming returns the upcoming dates with their exercise counts, a past plan is shown as it was while equipment going down only affects today and later, the local-day helper is correct at midnight boundaries; manual (not yet done in a browser): today's plan with the trainer notes and badge, the Other days tab (last 7 days, Coming up chips, any date) with read-only ticks, and the empty state work on a phone

Task: implement the member's view of today's plan, their plans by date (past history and upcoming days), the trainer notes on a plan, and marking exercises as completed.

Context:
- FR-20 in docs/02-requirements.md and the daily plan flow in docs/03-features-and-flows.md (flow 4). An exercise is performable only if it needs no equipment or at least one linked item is available (FR-17), using the predicate from P-06.
- A past plan is history (RN-17, FR-59): its exercises are not re-filtered by equipment that went down after that date, so a past day shows what the member had. Only a plan dated today or later is checked against the current availability.
- The member reads the notes and edits trainers left on their own plan, in full (FR-19, P-15), so the plan view carries them.
- All "today" and date logic uses the server's local timezone, with no per-user timezone (FR-39). Put that in one helper so later prompts reuse it.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.
- Don't build trainer review or chat.

Functional requirements:
1. lib/dates.ts with todayLocal() and helpers for local-day boundaries that accept an injected clock for tests.
2. Procedures, all limited to the signed-in member through the ability: plans.getToday, plans.getByDate({ date }) (any date, including a future one), plans.listDates({ from, to }), plans.listUpcoming (the dates from today on that already hold a plan, soonest first, each with its status and exercise count) and plans.markExerciseCompleted({ planExerciseId, completed }). Every exercise in a response carries isPerformable, computed at read time and always true for a past plan. The plan view also carries trainerNotes: every note and edit of that plan with author, text, whether it is an edit and time, oldest first.
3. Page (member)/plan: today's plan with sets, reps, load and instructions; a completion checkbox with an optimistic update; unavailable exercises shown as disabled with an explanation (P-30 adds a must-review notice on the plan when any exercise cannot be done); the notes from the trainers in full, with an "Edited the plan" flag on an edit, and a badge "Edited by a trainer" when the plan status is trainer_edited, or "Trainer note" when there is a note without an edit; a second tab called "Other days" with a date picker, the last 7 days and a "Coming up" row of date chips with their exercise count (read-only for past dates, and for upcoming dates the plan and its muscle map are shown with the ticks switched off and an "Upcoming" badge); an empty state with a button that calls plans.generateToday; skeleton loading (a per-page skeleton inside GuardedContent, built from components' .Skeleton; rules/frontend.md "Loading states") and explicit error states; usable on a phone.

Acceptance criteria:
- A member cannot read or change another member's plan.
- isPerformable follows the availability rule when equipment is toggled, for a plan dated today or later, and a past plan is unaffected by it.
- The local-day helper gives the right day just before and just after midnight.
- A member can open an upcoming plan and see the trainer notes on any of their plans.

Tests:
- Vitest against the test database for the criteria above. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
