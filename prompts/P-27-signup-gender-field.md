Blocked by: none
Fixes: P-07
Covers: FR-45
MVP: 2
Artifacts: apps/api/src/db/schema/users.ts (gender column + enum), migration, packages/shared/src/schemas/signup.ts (StartSignupInputSchema), apps/api/src/modules/aptitude/{repository,service}.ts, apps/web/src/app/signup/basic-info-step.tsx
Evidence: Vitest against Postgres: signup persists a chosen gender, omitting it leaves the column null, an invalid value is rejected by the schema before it reaches the database

Task: add an optional gender field to the signup basic-information step.

Context:
- FR-45 in docs/02-requirements.md and the `gender` column in docs/05-data-model.md, added after this project was already in progress (docs/09-audit-log.md, finding 11): the field was never in the original requirements, so it never existed until now.
- This corrects P-07, which is already implemented. Only add the field; don't change the resume/duplicate/rejection behavior P-07 already covers.

Permitted scope:
- Only the files in Artifacts and the schema/index.ts export line if the migration needs it. No new dependencies.
- Don't touch the photo step, the aptitude questionnaire, or anything outside the basic-information step.

Functional requirements:
1. `d_users.gender` exactly as in docs/05-data-model.md: enum (`female`, `male`, `prefer_not_to_say`), nullable.
2. `StartSignupInputSchema` gains an optional `gender` field accepting only those three values (or omitted entirely).
3. `aptitude.startSignup` passes `gender` through to both `insertPendingApplicant` (new signup) and `updateBasicInfo` (resumed signup) when present; when omitted, an existing value is left untouched on resume (don't overwrite a previously chosen gender with a blank one).
4. Basic-info form: a gender select with the three options plus a default "Prefer not to say" state, clearly optional (no asterisk, no validation error when left at the default).

Acceptance criteria:
- Submitting with a gender persists it; submitting without one leaves the column null.
- Resuming an existing signup without resubmitting gender does not clear a value chosen earlier.
- An out-of-enum value is rejected by the zod schema, never reaches the database.

Tests:
- Vitest against the test database extending the existing aptitude service tests. Run only the aptitude module's tests.

Final response:
- Respond in at most 8 lines with files changed, tests run, and pending items.
