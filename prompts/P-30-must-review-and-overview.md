Blocked by: P-29, P-15, P-14
Fixes: none
Covers: FR-53, FR-54, FR-55, FR-56, RN-14
MVP: 4
Artifacts: apps/api/src/modules/plans/{service.ts (needsReview, lastEditedAt, lastEditedByName and per-exercise equipmentDown on the plan view), repository.ts (findExerciseRowsForPlans, findRecentReviews), reviews-service.ts (needsReview, unavailableCount and noteCount on the queue, blocked, recentMuscleLoad and muscleFocus on getPlan, getOverview), reviews-router.ts (reviews.overview), reviews-router.test.ts}, apps/api/src/modules/metrics/{service,router}.ts (metrics.week) and router.test.ts, apps/web/src/app/(staff)/reviews/ (queue badge, Must review and Trainer filters with Trainer note, sorting, [planId]/plan-muscle-preview.tsx, [planId]/plan-review-detail.tsx banner), apps/web/src/app/(staff)/staff/{page,overview-board,overview-row,certificates-waiting,pool-section}.tsx (the three summary lines and the two-column pool card), apps/web/src/components/plan-status-badge.tsx, apps/web/src/app/(member)/home/page.tsx (the Now screen), apps/web/src/app/(member)/plan/ (must-review notice), apps/web/src/components/muscle-map/muscle-load-view.tsx (single-view option for a narrow column)
Evidence: Vitest against Postgres: a plan dated today with an exercise whose only equipment is off is flagged in reviews.queue with its unavailableCount and in the member's plan view with the equipment down, a plan dated in the past is not, and switching the equipment back on clears the flag with no write (RN-14); reviews.overview lists the plan first with its blocked exercise, counts only exercises that can be done in the pool map, lists every piece of equipment with the number of today's plans that use it and the pieces that are down first, counts the plans a trainer edited or noted with the latest entry (reviews.queue tells a note without an edit apart through noteCount), and is refused for a member; reviews.getPlan adds the 14 days of completed muscle load before the plan and the member's focus; metrics.week returns the days with a check-in and the latest check-in of the caller only. Pages are validated manually

Task: flag plans that hold an exercise that cannot be done as must-review for the member and for staff, and replace the member Home and the staff Overview with screens that earn their place (FR-53 to FR-56, RN-14).

Context:
- FR-53 to FR-56 in docs/02-requirements.md, flows 10 to 12 and the plan review step of flow 6 in docs/03-features-and-flows.md, §13 of docs/04-architecture.md, the derived queries in docs/05-data-model.md §3, and rule RN-14 in docs/06-business-rules.md.
- The flag is derived on every read from the FR-17 predicate of P-06 and never stored: there is no new column, no acknowledged state and no notification. It never blocks publication (principle 1). A plan dated before today is never flagged.
- Whether a plan lacks something useful for the member is the trainer's own professional judgement. The system only shows facts (the muscle map, the flag, who touched the plan); it never scores or declares a plan good or bad. A technical failure to load any of this is shown as its own error state, never as an empty list (principle 4).
- The visual rules are in DESIGN.md (Must-Review Notice, Week Strip, Pool Map, Layout). Any new component pattern goes through the impeccable skill.

Permitted scope:
- Only the files in Artifacts and the router registrations. No schema change, no new dependencies.
- No new policy: reviews.overview uses the read of every member's plans that reviews.queue uses, and metrics.week the self-scoped read of the member's own metrics.
- Don't change check-in, turnstile, auth, the aptitude flow or the AI prompts.

Functional requirements:
1. A pure rule shared by the member view and the staff queue: a plan is must-review when its date is today or later and at least one exercise fails the FR-17 predicate. The plan view gains needsReview, lastEditedAt, lastEditedByName and, per exercise, equipmentDown (the linked equipment that is out of service).
2. reviews.queue entries gain needsReview, unavailableCount and noteCount (plain trainer notes, not the entries an edit leaves). reviews.getPlan gains blocked, recentMuscleLoad (completed work in the 14 days before the plan date) and muscleFocus. reviews.overview returns today's date, the number of today's plans, musclePlans (per muscle, how many of today's plans train it through an exercise that can be done), equipment (every piece with isAvailable and planCount, the number of today's plans that use it; pieces that are down first, then by plan count), the must-review plans with their blocked exercises, and trainerActivity (planCount, the plans a trainer edited or noted, and latest, the most recent note or edit across all plans).
3. metrics.week returns the days of a range with a check-in and the latest check-in instant for the caller.
4. Plan review: a Must review badge and filter in the queue (flagged plans first; the filters are All, Must review, AI and Trainer, where Trainer holds every plan a trainer edited or noted, AI holds the rest, and a row shows Trainer edited or, for a note without an edit, Trainer note), a banner on the review page, and a muscle balance preview that follows the exercises as they are edited and switches to the member's last 14 days, outlining the member's focus and noting focused muscles the plan does not train.
5. Member: a must-review notice on the plan page and the Now screen with a confirmed "rebuild without them" action. The Home becomes the Now screen: date and tally, check-in and gym status, next exercise with a Done action, remaining list, since-last-visit line when a trainer edited the plan, and a Monday to Sunday week strip. No muscle map on Home, and no side column nested inside another.
6. Staff Overview: three equal summary lines, each a number, a title, one sentence and a link, never a full list: Must review (links to /reviews?status=must_review), Trainer edits and notes (links to /reviews?status=trainer_edited) and, for the admin, certificates waiting with the oldest wait (links to /certificates). Below them a full-width Today's pool card in two columns: the pool muscle map on the left, and on the right a scrollable list of every piece of equipment (pieces that are down first and struck through, each with X/N of today's plans that use it) that takes the height of the map column. One calm sentence when nothing needs attention.

Acceptance criteria:
- A plan dated yesterday with an exercise that cannot be done is not flagged; the same plan dated today is.
- Switching the equipment back on, or editing the exercise out, clears the flag without any write to the plan.
- The pool map counts only exercises that can be done now, and nothing on it or on the review page judges a plan.
- A member cannot call reviews.overview, and metrics.week never returns another member's days.

Tests:
- Vitest against the test database for the criteria above. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
