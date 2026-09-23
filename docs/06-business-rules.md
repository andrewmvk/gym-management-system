# Business Rules (RN)

Unit 2 asks that we distinguish **functional requirement** ("what the system does"), **non-functional
requirement** ("with what quality"), and **business rule** ("what domain condition must be honored").
`docs/02-requirements.md` already numbers FR-1..FR-44 (functional) and NFR-1..NFR-6 (non-functional),
but several business rules are **embedded as prose inside the FRs**, without their own code. This
document extracts the most important ones as RN-01..RN-11, in the format Unit 2 recommends (code,
description, source requirement, verification criterion) - so each one becomes an isolated, testable
prompt, like the `AssessmentService.complete()` example in the course booklet.

This list isn't exhaustive - it's an example of how to do the extraction. Completing it with the
remaining rules (e.g. everything involving `f_user_policy_on_user.effect = denied`) is left as an
exercise.

| Code | Description | Source | Verification criterion |
|---|---|---|---|
| RN-01 | An aptitude/certificate result can only be `cleared`, `not_cleared`, or `pending_retry`; `pending_retry` can never be interpreted as a real decision. | FR-4, FR-5, PRODUCT.md principle 4 | An AI failure/timeout during evaluation records `pending_retry`, never `cleared` or `not_cleared`, and never throws an unhandled exception. |
| RN-02 | Every medical certificate result - `cleared`, `not_cleared`, or `pending_retry` - is routed to the Admin's review queue, no exceptions. | FR-6 | Saving any `f_medical_certificates` row produces an entry in the Admin queue regardless of `ai_result`. |
| RN-03 | A member with a final `not_cleared` result never receives a `password_hash` or authenticated access. | FR-8 | Attempting to set a password for a `d_users` row with `aptitude_status = rejected` must fail. |
| RN-04 | An exercise is only includable in a plan if it needs no equipment OR at least one linked equipment item is `is_available = true`. | FR-17 | The predicate and its five cases are specified in `prompts/P-06-exercise-catalog.md`. |
| RN-05 | `d_exercises` is add-only: no code path may delete a row. | FR-24, rules/database.md | No `catalog.deleteExercise` procedure exists in any router. |
| RN-06 | If the AI is about to regenerate a plan for a date that already has a trainer's direct edit (`status = trainer_edited`), the member must confirm before the regeneration overwrites the edit. | FR-22 | Regenerating without prior confirmation must be rejected/blocked by the procedure. |
| RN-07 | A retroactive correction directly overwrites that date's historical record; metrics must reflect the corrected version, not the original. | FR-23 | After a correction, a metric that sums that day uses the new values, not the old ones. |
| RN-08 | In facial matching, if the two best candidates are both above the threshold and too close to each other, the result is "no match" - never a guess. | FR-32 | Given a pair of embeddings with a distance below the tie-break margin, the matching function returns a rejection, not the higher-scoring candidate. |
| RN-09 | A check-in is always recorded, with `turnstile_status` of `success` or `failed`, regardless of the outcome of the external turnstile call. | FR-33, FR-34 | Simulate a failure in the turnstile API and confirm the `f_check_ins` row is still created, tagged `failed`. |
| RN-10 | A user's effective permission is the union of every non-expired `f_user_policy_on_user` row; a row with `effect = denied` always wins over a `granted` row for the same policy. | FR-42, docs/05-data-model.md | Granting and then denying the same policy to the same user must result in `ability.cannot(...)`. |
| RN-11 | Trainer/admin accounts only ever exist via the seed script; no application code path can create one. | FR-41, FR-43 | There is no public "signup" mutation that writes a staff policy. |

## How to use this in prompts

Each RN is verified inside the prompt of the feature it protects (see the "Acceptance criteria" and
"Tests" of that prompt), following the Unit 1 §9 model. `prompts/README.md` lists which prompt covers
which requirement, and `docs/08-traceability-matrix.md` tracks the evidence. `prompts/P-06-exercise-catalog.md`
is a complete example for RN-04 and RN-05.
