Blocked by: P-13
Covers: FR-19, FR-22
MVP: 3
Artifacts: apps/api/src/modules/plans/ (review procedures and regeneration guard), apps/web/src/app/(staff)/reviews/
Evidence: Vitest against Postgres: notes from several trainers are all kept in order, an edit flips the plan to trainer_edited, regeneration without confirmation is refused (RN-06) and with confirmation succeeds; manual: a trainer reviews and edits a plan

Task: implement the trainer review queue, notes, direct edits, and the regeneration confirmation guard.

Context:
- FR-19 and FR-22 in docs/02-requirements.md, the trainer flow in docs/03-features-and-flows.md (flow 6), f_plan_reviews in docs/05-data-model.md, and rule RN-06 in docs/06-business-rules.md.
- Review is asynchronous and never blocks publication. Any trainer can act on any plan (shared pool). Later notes never overwrite earlier ones.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.

Functional requirements:
1. Procedures guarded by the plan review abilities: reviews.queue (recent plans across members with member name, status, and last note), reviews.getPlan, reviews.addNote({ planId, note }) inserting a comment row, and reviews.editPlan({ planId, exercises, note? }) replacing the exercise list, setting status trainer_edited with last_edited_by_user_id and last_edited_at, and inserting a row with is_edit true.
2. Complete the guard started in P-13: plansService.regenerate({ userId, date, confirmOverwrite }) returns { status: "needs_confirmation", editedBy, editedAt } when the plan is trainer_edited and confirmOverwrite is not true, as data and not an exception. With confirmation it regenerates and the review history stays.
3. Staff pages: (staff)/reviews queue and a plan detail page with the exercise table, the notes history (author, time, comment or edit badge), an add-note form, and an edit form to change sets, reps and load and to add or remove catalog exercises.

Acceptance criteria:
- Notes from two trainers on one plan are both kept, in order.
- A member cannot call any reviews.* procedure.
- The guard returns needs_confirmation exactly for trainer_edited plans without confirmation.

Tests:
- Vitest against the test database, including a table over plan status x confirmOverwrite for RN-06. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
