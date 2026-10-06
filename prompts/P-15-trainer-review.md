Blocked by: P-13
Covers: FR-19, FR-22, FR-60 (the plan review page only), the rewording of FR-19 and FR-22, RN-06, RN-16, RN-17
MVP: 3
Artifacts: apps/api/src/modules/plans/ (review procedures: reviews-router, reviews-service, the regeneration guard), apps/api/src/modules/members/service.ts (getMemberContext), apps/web/src/app/(staff)/reviews/ (queue, queue-filter, use-queue-filters, and [planId]/{plan-review-body, member-context-card, plan-neighbors, exercise-picker, review-history})
Evidence: Vitest against Postgres: notes from several trainers are all kept in order, any staff member can read them with author and date, an edit flips the plan to trainer_edited, a trainer edit of a plan dated before today is refused ("Past plans cannot be edited"), editPlan needs update TrainingPlan as well as manage PlanReview while a note needs only the review policy, a trainer edit keeps the ticks of the exercises that stay, getPlan carries each exercise's tick and the member context (the What the AI knew card), regeneration without confirmation is refused (RN-06) and with confirmation succeeds and the review history stays; manual (not yet done in a browser): a trainer reviews, edits and adds a note, walks the queue with Previous and Next, and an admin sees the page read-only
Status: Partly superseded by P-31 (audit-log item 20): the member context carries no aptitude answers (the code, its card and its test still do until P-31 is executed), and it gains the member's height, weight and exam findings

Task: implement the trainer review queue, notes, direct edits, the "What the AI knew" context, and the regeneration confirmation guard.

Context:
- FR-19, FR-22 and FR-60 in docs/02-requirements.md, the trainer flow in docs/03-features-and-flows.md (flow 6), f_plan_reviews in docs/05-data-model.md, and rules RN-06, RN-16 and RN-17 in docs/06-business-rules.md.
- Review is asynchronous and never blocks publication. Any trainer can act on any plan (shared pool). Later notes never overwrite earlier ones.
- Notes are readable by any staff member (trainer or admin) and by the member whose plan it is (P-14); the AI also uses them as guidance when it builds that member's plans (P-13).
- Writing follows the abilities: a note needs the plan-review policy (manage PlanReview, a trainer), and changing the exercises also needs update TrainingPlan on all plans, so an admin only reads. A plan dated before today is history (RN-17): it cannot be edited, a note can still be added.
- A trainer judges safety from what the AI knew, so the review page shows the member's context next to the exercises.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.

Functional requirements:
1. Procedures guarded by the plan review abilities: reviews.queue (recent plans across members with member name, status, and last note; P-30 adds needsReview, unavailableCount and noteCount to each entry, and a reviews.overview procedure for the staff Overview), reviews.getPlan (the plan, its exercises with whether the member did each one, the review history, the catalog, and memberContext), reviews.addNote({ planId, note }) inserting a comment row, and reviews.editPlan({ planId, exercises, note? }) requiring manage PlanReview and update TrainingPlan, refusing a plan dated before today, replacing the exercise list while keeping the tick of every exercise that stays (matched by exercise), setting status trainer_edited with last_edited_by_user_id and last_edited_at, and inserting a row with is_edit true.
2. memberContext (what the AI knew) holds the member's name and age, the latest onboarding submission (goals, medications, conditions and other notes; with height, weight and exam findings from P-31), and the unresolved remembered facts with the member's own words and dates, so a trainer can judge safety. There is no aptitude data (P-31).
3. Complete the guard started in P-13: plansService.generateForDate(userId, date, confirmOverwrite) returns { status: "needs_confirmation", reason, editedBy, editedAt, completedCount } as data and not an exception when the plan is trainer_edited (reason trainer_edited) or holds ticked exercises (reason has_completed) and confirmOverwrite is not true. With confirmation it regenerates, the ticks of the exercises that stay are kept, and the review history stays.
4. Staff pages: (staff)/reviews queue with its status tabs and a "When" scope filter (Today and later by default, Past, All dates; the Trainer tab opens on all dates), and a plan detail page with the "What the AI knew" card, the exercise table showing which exercises the member did, the notes history (author, time, comment or edit badge), a searchable add-exercise picker, previous and next plan through the queue in the same order and filter, and ONE note field with two actions: "Save changes" (publishes the edit and attaches the note to it, enabled only when the plan changed) and "Add note only". The write controls follow the abilities: an admin reads ("You can read this plan. Trainers edit it and leave notes.") and a past plan is read-only ("Past plans cannot be edited. You can still leave a note.").

Acceptance criteria:
- Notes from two trainers on one plan are both kept, in order, and an admin can read them.
- A member cannot call any reviews.* procedure, and an admin cannot add a note or edit a plan.
- A plan dated before today cannot be edited; a note can still be added.
- A trainer edit never unticks an exercise that stays in the plan.
- The guard returns needs_confirmation exactly for trainer_edited plans or plans with ticked exercises without confirmation.

Tests:
- Vitest against the test database, covering plan status (edited by a trainer, ticked) x confirmOverwrite for RN-06. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
