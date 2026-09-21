Blocked by: P-03, P-05
Covers: FR-12, FR-13, FR-14
MVP: 2
Artifacts: apps/api/src/db/schema/onboarding.ts, migration, packages/shared/src/schemas/onboarding.ts, apps/api/src/modules/onboarding/{router,service,repository}.ts, apps/web/src/app/(member)/onboarding/
Evidence: Vitest against Postgres: two submissions create two rows, the status is false before the first, attachments are stored, another member cannot read them; manual: the form works on a phone

Task: implement the detailed onboarding data capture, stored append-only, with its member screen.

Context:
- FR-12 to FR-14 in docs/02-requirements.md, the onboarding flow in docs/03-features-and-flows.md (flow 2), and f_onboarding_submissions in docs/05-data-model.md. jsonb columns always pair with a zod schema (rules/database.md).
- Onboarding is not one-time (FR-14): each submission is a new row and the AI reads all of them.
- FR-12 also lists "any other free-form relevant info", but docs/05-data-model.md has no column for it. Store it as an otherNotes string inside the physical_conditions zod schema, and flag the doc gap in the final response instead of changing the data model yourself.
- Uploads come from P-05.

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.
- Don't send e-mail, redirect, or generate a plan here.

Functional requirements:
1. f_onboarding_submissions as in docs/05-data-model.md, plus the shared zod schemas for medications, physical_conditions (with otherNotes) and exam_attachment_paths.
2. onboarding.submit({ medications, physicalConditions, goals, attachments }), requiring manage_own_onboarding. It stores each attachment through the uploads adapter (kind exam) and always inserts a new row. onboarding.getStatus returns { completed, lastSubmittedAt } where completed means at least one submission exists. onboarding.listMine returns the member's own submissions.
3. Member page (member)/onboarding: medications list, physical conditions and limitations list with other notes, goals, and multiple exam attachments (image or PDF). After submitting show a short "your plan is being prepared" state. An "update my information" entry lets the member add a new submission later.

Acceptance criteria:
- Submitting twice keeps both rows; getStatus is false until the first submission.
- A member can only read their own submissions and files.
- Invalid or oversized attachments are rejected with a clear message.

Tests:
- Vitest against the test database for the criteria above. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, the flagged doc gap, and pending items.
