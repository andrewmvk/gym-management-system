Blocked by: P-13
Covers: FR-20, FR-59 (d: upcoming plans), the member side of FR-19 (the trainer notes on the plan), RN-17
MVP: 2
Artifacts: plan view procedures in apps/api/src/modules/plans/ (including plans.listDays and the trainerNotes of the plan view), apps/api/src/lib/dates.ts, apps/web/src/app/(member)/plan/ (page, day-strip, day-plan, plan-day, exercise-row, exercise-note, plan-muscle-panel, trainer-notes)
Evidence: Vitest against Postgres: a member reads only their own plans, marking an exercise works, a future plan can be fetched by date and listDays returns the plans in a range with their exercise and done counts (and never another member's or one outside the range), a past plan is shown as it was while equipment going down only affects today and later, the local-day helper is correct at midnight boundaries; manual (not yet done in a browser): the week day strip (tiles, week arrows, Today, any date), today's plan with the trainer notes and badge, a past day read-only, a day ahead with the ticks locked, the exercise note icon (hover on a mouse, tap on a phone) and the empty states work on a phone

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
2. Procedures, all limited to the signed-in member through the ability: plans.getToday, plans.getByDate({ date }) (any date, including a future one), plans.listDates({ from, to }), plans.listDays({ from, to }) (the plans in the range, oldest first, each with its status, exercise count and done count) and plans.markExerciseCompleted({ planExerciseId, completed }). Every exercise in a response carries isPerformable, computed at read time and always true for a past plan. The plan view also carries trainerNotes: every note and edit of that plan with author, text, whether it is an edit and time, oldest first.
3. Page (member)/plan, one page with no tabs: a day strip showing one Monday-to-Sunday week (a tile per day with its done segments, a check or count, week arrows, a Today button and a date picker, the chosen day in the `date` search param), and under it the plan of the chosen day with its muscle map inside the card: today's plan with sets, reps, load and instructions and a completion checkbox with an optimistic update (which also moves the day's tile); a past day read-only; a day ahead with the ticks switched off; unavailable exercises shown as disabled with an explanation (P-30 adds a must-review notice on the plan when any exercise cannot be done); an exercise's own note behind an icon that opens on hover and on click or tap; the day's completion in the plan header; the notes from the trainers in full, with an "Edited the plan" flag on an edit, and a badge "Edited by a trainer" when the plan status is trainer_edited, or "Trainer note" when there is a note without an edit; an empty state per kind of day (a button that calls plans.generateToday for today, an "ask your coach" button for a day ahead, "Rest day" for a past one); skeleton loading (a per-page skeleton inside GuardedContent, built from components' .Skeleton; rules/frontend.md "Loading states") and explicit error states; usable on a phone.

Acceptance criteria:
- A member cannot read or change another member's plan.
- isPerformable follows the availability rule when equipment is toggled, for a plan dated today or later, and a past plan is unaffected by it.
- The local-day helper gives the right day just before and just after midnight.
- A member can open an upcoming plan and see the trainer notes on any of their plans.

Tests:
- Vitest against the test database for the criteria above. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
