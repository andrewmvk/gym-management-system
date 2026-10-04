Blocked by: P-03, P-05
Covers: FR-12, FR-13, FR-14, and the Health profile part of FR-58 (the member's current profile and the prefilled update form; the remembered facts on the same page are P-16)
MVP: 2
Artifacts: apps/api/src/db/schema/onboarding.ts, migration, packages/shared/src/schemas/onboarding.ts, apps/api/src/modules/onboarding/{router,service,repository}.ts, apps/web/src/app/(member)/onboarding/{page,onboarding-view,onboarding-form,current-profile,exam-attachments-field,string-list-field}.tsx (the page titled Health profile)
Evidence: Vitest against Postgres: two submissions create two rows, the status is false before the first, attachments are stored, another member cannot read them, an invalid attachment is rejected with a clear message; manual (not yet done in a browser): the form works on a phone, a member with a submission sees the current profile and the update form opens prefilled
Status: Partly superseded by P-31 (audit-log item 20): onboarding also collects height and weight (both required) and structured exam entries (name, optional date, typed findings, optional file), and is required before using the app. The code still has the older fields until P-31 is executed

Task: implement the detailed onboarding data capture, stored append-only, with its member screen, the Health profile page.

Context:
- FR-12 to FR-14 in docs/02-requirements.md, the onboarding flow in docs/03-features-and-flows.md (flow 2), and f_onboarding_submissions in docs/05-data-model.md. jsonb columns always pair with a zod schema (rules/database.md).
- Onboarding is not one-time (FR-14): each submission is a new row. The newest submission is the current truth for the AI; older ones only add history that it does not contradict (P-13, P-16).
- FR-12 also lists "any other free-form relevant info", but docs/05-data-model.md has no column for it. Store it as an otherNotes string inside the physical_conditions zod schema, and flag the doc gap in the final response instead of changing the data model yourself.
- Uploads come from P-05.
- The Health profile page is the member's single place for "what the system knows about me": the current profile (the newest submission) and, from P-16, the facts the coach remembered from chat (FR-58).

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.
- Don't send e-mail or redirect here (P-12). Plan generation after a submission is the single best-effort call P-13 adds to the submit service.

Functional requirements:
1. f_onboarding_submissions as in docs/05-data-model.md, plus the shared zod schemas for medications, physical_conditions (with otherNotes) and exam_attachment_paths.
2. onboarding.submit({ medications, physicalConditions, goals, attachments }), requiring manage_own_onboarding. It stores each attachment through the uploads adapter (kind exam) and always inserts a new row. onboarding.getStatus returns { completed, lastSubmittedAt } where completed means at least one submission exists. onboarding.listMine returns the member's own submissions, newest first.
3. Member page (member)/onboarding, titled Health profile. A member with no submission yet goes straight to the form: medications list, physical conditions and limitations list with other notes, goals, and multiple exam attachments (image or PDF). A member with at least one submission sees their current profile (the newest submission: goals, medications, conditions, other notes, how many exam files are on file, and when it was last updated) with an "Update my profile" action, next to the remembered facts (P-16). The update form opens prefilled with the current profile (attachments are not prefilled), and every update is saved as a new entry. After submitting, show a short confirmation that the plan is ready, or a retryable error when the plan could not be built.
4. A submission triggers the best-effort plan generation of P-13 for today; it never overwrites a plan the member already ticked or a trainer edited, and its failure never fails the submission.

Acceptance criteria:
- Submitting twice keeps both rows; getStatus is false until the first submission.
- A member can only read their own submissions and files.
- Invalid or oversized attachments are rejected with a clear message.
- The page shows the newest submission as the current profile, and the update form starts from it.

Tests:
- Vitest against the test database for the criteria above. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, the flagged doc gap, and pending items.
