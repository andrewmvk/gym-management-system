Blocked by: P-04, P-07
Covers: FR-3, FR-4
MVP: 2
Artifacts: apps/api/src/db/schema/aptitude.ts (questionnaire table), migration, packages/shared/src/schemas/aptitude.ts, aptitude procedures for the questionnaire, the questionnaire and result screens in apps/web/src/app/signup/
Evidence: Vitest with the AI mock: cleared, not_cleared, and unavailable each produce the documented state, recheck only works on pending_retry, and pending_retry never turns into a real decision on its own

Task: implement the aptitude questionnaire, its AI evaluation with the pending_retry state, and the matching signup screens.

Context:
- FR-3 and FR-4 in docs/02-requirements.md, docs/04-architecture.md §4, rules/error-handling.md, and rule RN-01 in docs/06-business-rules.md: an AI failure is its own state and is never coalesced into cleared or not_cleared.
- FR-4 says a pending_retry result is re-evaluated only when the member reopens the page or asks for a re-check. There is no background retry job.
- The AI module (P-04) already reports failures as data. Use its aptitude purpose and its mock switches.

Permitted scope:
- Only the files in Artifacts. Create only the f_aptitude_questionnaires table here (the certificates table belongs to P-10) and add its export to schema/index.ts.
- No new dependencies.

Functional requirements:
1. f_aptitude_questionnaires exactly as in docs/05-data-model.md, using the ai_result enum (cleared, not_cleared, pending_retry).
2. A shared, versioned constant QUESTIONNAIRE_V1 with about twelve yes/no health questions (heart condition, blood pressure, chronic disease, injuries, surgeries, medication, dizziness, pain during exercise, medical restriction and similar) each with an optional detail field, plus its zod schema. The frontend renders from this constant.
3. aptitude.submitQuestionnaire({ userId, answers }): store the answers, call the AI module, and map the result: ok maps to the AI verdict, any failure maps to pending_retry. On cleared set aptitude_status to cleared; on not_cleared keep it pending and return { status: "certificate_required" }.
4. aptitude.recheck({ userId }) re-runs the evaluation only when the latest result is pending_retry. aptitude.getStatus({ userId }) returns the questionnaire result, the certificate result if any, and the final status, so a returning applicant resumes in the right place.
5. Frontend step 3 and the result states: cleared (continue to the password step, P-09), pending_retry ("still processing, check again" with a re-check button), and certificate_required (continue to the certificate step, P-10).

Acceptance criteria:
- An AI failure stores pending_retry and returns normally, with no exception and no verdict.
- recheck is refused unless the latest result is pending_retry.
- The three mock modes each reach their screen by hand.

Tests:
- Vitest against the test database with the AI mock, covering the criteria above. Run only these tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
