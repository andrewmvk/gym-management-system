# Business Rules (RN)

Unit 2 asks that we distinguish **functional requirement** ("what the system does"), **non-functional
requirement** ("with what quality"), and **business rule** ("what domain condition must be honored").
`docs/02-requirements.md` already numbers FR-1..FR-62 (functional) and NFR-1..NFR-6 (non-functional),
but several business rules are **embedded as prose inside the FRs**, without their own code. This
document extracts the most important ones as RN-01..RN-17, in the format Unit 2 recommends (code,
description, source requirement, verification criterion) - so each one becomes an isolated, testable
prompt, like the `AssessmentService.complete()` example in the course booklet.

This list isn't exhaustive - it's an example of how to do the extraction. Completing it with the
remaining rules (e.g. everything involving `f_user_policy_on_user.effect = denied`) is left as an
exercise.

| Code | Description | Source | Verification criterion |
|---|---|---|---|
| RN-01 | A technical failure is its own state and is never coalesced into a real outcome: when the AI fails or returns nothing usable, plan or chat generation fails with an error and saves no plan, and a failed turnstile call is recorded as `failed`, never as `success`. | FR-15, FR-33, FR-59, PRODUCT.md principle 4 | An AI failure/timeout during plan generation (generator mode `ai`) surfaces "AI is temporarily unavailable", saves no `f_training_plans` row and throws no unhandled exception; a turnstile failure creates the `f_check_ins` row tagged `failed`. |
| RN-02 | Removed 2026-10-04 (audit-log item 20): there are no medical certificate results in the system, so there is no Admin certificate queue (was FR-6). | FR-6 (removed) | None. |
| RN-03 | Removed 2026-10-04 (audit-log item 20): there is no rejected applicant or blocked e-mail; acceptance happens in person at the gym (was FR-8). | FR-8 (removed), FR-57 | None. |
| RN-04 | An exercise is only includable in a plan if it needs no equipment OR at least one linked equipment item is `is_available = true`. | FR-17 | The predicate and its five cases are specified in `prompts/P-06-exercise-catalog.md`. |
| RN-05 | `d_exercises` is add-only: no code path may delete a row. | FR-24, rules/database.md | No `catalog.deleteExercise` procedure exists in any router. |
| RN-06 | If the AI is about to regenerate a plan for a date that already has a trainer's direct edit (`status = trainer_edited`) or exercises the member already ticked off, the member must confirm before the regeneration replaces it. | FR-22, FR-59 | Regenerating such a plan without prior confirmation returns `needs_confirmation` (reason `trainer_edited` or `has_completed`) and changes nothing; it proceeds only after the member confirms. |
| RN-07 | A retroactive correction directly overwrites that date's historical record; metrics must reflect the corrected version, not the original. | FR-23 | After a correction, a metric that sums that day uses the new values, not the old ones. |
| RN-08 | In facial matching, if the two best candidates are both within the threshold and too close to each other, the result is "ambiguous" (a rejection) - never a guess. | FR-32 | Given a pair of embeddings that are both within the threshold and whose distances differ by less than the tie-break margin, the matching function returns `ambiguous`, not the closer candidate. |
| RN-09 | A check-in is always recorded, with `turnstile_status` of `success` or `failed`, regardless of the outcome of the external turnstile call. | FR-33, FR-34 | Simulate a failure in the turnstile API and confirm the `f_check_ins` row is still created, tagged `failed`. |
| RN-10 | A user's effective permission is the union of every non-expired `f_user_policy_on_user` row and every policy of each non-expired `f_user_policy_group_on_user` membership; a direct row with `effect = denied` always wins over a `granted` policy for the same policy, whether that grant is direct or arrives through a group. | FR-42, FR-47, docs/05-data-model.md | Granting and then denying the same policy to the same user must result in `ability.cannot(...)`; so must denying directly a policy the user holds only through a group. An expired membership grants nothing. |
| RN-11 | Trainer/admin accounts only ever exist via the seed script; no application code path can create one. | FR-41, FR-43 | There is no public "signup" mutation that writes a staff policy. |
| RN-12 | A face embedding is never computed for a member without a prior recorded consent event. The consent event is recorded in the same transaction as the registration, before the embedding is computed, and a rejected photo rolls both back. | FR-46, FR-9, docs/05-data-model.md `f_consent_events` | A registration submitted without consent must be refused; a registration whose photo is rejected must leave no `d_users` row and no `f_consent_events` row behind. |
| RN-13 | Policy groups are read-only in the application, and an admin can never remove their own access to the staff area or to policy management, whether directly or by leaving the group that supplies it. | FR-43, FR-47 | No procedure creates, edits or deletes a `d_user_policy_group` or `d_user_policy_group_policy` row. Revoking or denying `read_staff_app` or `manage_policy_assignments` on yourself, or ending your only active group that supplies either, is refused. |
| RN-14 | A plan dated today or later that holds an exercise that cannot be done (RN-04 fails for it) is a must-review plan. The flag is derived on every read, never stored, never blocks publication or access, and a plan dated before today is never flagged. | FR-53, FR-18, PRODUCT.md principle 1 | With a plan for today holding an exercise whose only equipment is switched off, `reviews.queue` and the member's plan view report it as must-review; switching the equipment back on, or editing the exercise out, clears it with no write to the plan; the same plan dated yesterday is not flagged; the plan stays published throughout. |
| RN-15 | A member whose membership is `inactive` cannot log in and cannot check in. | FR-40, FR-33 | A login with a correct password for an `inactive` member fails with "Your membership is inactive. Ask the front desk to reactivate it." and an existing session of that member stops working; the kiosk check-in route answers 403 with `reason: 'membership_inactive'`, makes no turnstile call and creates no `f_check_ins` row; after an admin sets the status back to `active`, both work again. |
| RN-16 | Regenerating or editing a plan never silently discards the exercises the member already ticked off. | FR-59, FR-22 | After a regeneration or a trainer edit, every exercise that remains in the plan (matched by exercise) keeps `completed = true`; regenerating a plan with ticked exercises first returns `needs_confirmation` with reason `has_completed`; the automatic regeneration after onboarding skips such a plan and leaves it unchanged. |
| RN-17 | A plan dated before today is history: no trainer edit is allowed on it, and it is not re-filtered by the current equipment availability. | FR-59, FR-19, FR-53 | `reviews.editPlan` on a plan dated yesterday is rejected with "Past plans cannot be edited" while adding a note still works; switching off a piece of equipment used by yesterday's plan changes nothing in that plan's view, while the same switch affects a plan dated today. |

## How to use this in prompts

Each RN is verified inside the prompt of the feature it protects (see the "Acceptance criteria" and
"Tests" of that prompt), following the Unit 1 §9 model. `prompts/README.md` lists which prompt covers
which requirement, and `docs/08-traceability-matrix.md` tracks the evidence. `prompts/P-06-exercise-catalog.md`
is a complete example for RN-04 and RN-05.
