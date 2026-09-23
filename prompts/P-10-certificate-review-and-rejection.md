Blocked by: P-03, P-05, P-08, P-09
Covers: FR-5, FR-6, FR-7, FR-8
MVP: 3
Artifacts: apps/api/src/db/schema/aptitude.ts (certificates table), migration, apps/api/src/modules/aptitude/ (certificate procedures and state resolver), apps/web/src/app/signup/ (certificate step and waiting or rejected screens), apps/web/src/app/(staff)/certificates/
Evidence: Vitest table over every questionnaire result x certificate result x admin decision proves each certificate result reaches the admin queue and pending_retry is never coalesced; manual: an admin confirms and overrides from the queue

Task: implement the medical certificate path: upload, AI review, the admin backstop queue, and the final approval or rejection.

Context:
- FR-5 to FR-8 in docs/02-requirements.md, the signup flow in docs/03-features-and-flows.md, docs/05-data-model.md (f_medical_certificates), and rules RN-01, RN-02 and RN-03 in docs/06-business-rules.md.
- Every certificate result, cleared, not_cleared and pending_retry alike, is routed to the admin queue. The admin can confirm or override; overriding an AI not_cleared to cleared is the only recovery path.
- State machine to implement (FR-8 says "by AI or by Admin", while FR-6 and FR-7 route everything through the admin, so an AI not_cleared becomes final only when the admin confirms it; flag this reading in the final response): an AI cleared sets aptitude_status to cleared at once; an AI not_cleared or pending_retry leaves it pending ("under review"); an effective admin result of cleared sets cleared; an effective admin not_cleared sets rejected, which is final and keeps the e-mail blocked (FR-8). An admin decision changes the status only while the applicant has no password yet.

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.

Functional requirements:
1. f_medical_certificates as in docs/05-data-model.md.
2. Public certificates.upload({ userId, filename, mimeType, base64 }), allowed only after a not_cleared or persistent pending_retry questionnaire. Accept JPEG and PNG only (PDF text extraction is out of scope for this first generation; flag it). Store the file, call the AI module with the certificate purpose, and save ai_result and ai_notes; an AI failure saves pending_retry. Every row enters the admin queue.
3. Admin procedures, guarded by review_certificates: certificates.listQueue (all rows, unreviewed first, with applicant name and e-mail, never the embedding) and certificates.review({ certificateId, result }) where result is confirm, cleared or not_cleared. It sets reviewed_by_user_id, admin_reviewed_at and admin_override_result; the effective result is admin_override_result when present, otherwise ai_result.
4. A pure resolver function that maps (questionnaire result, certificate result, admin result, has password) to the final aptitude_status and next step, used by the procedures.
5. Frontend: the member certificate step (image upload) with waiting and rejected screens (including the blocked e-mail message), and the staff page (staff)/certificates with the queue table, AI badge and notes, the file shown through the authenticated route, and the confirm and override actions.

Acceptance criteria:
- Each of the three AI results creates a queue entry, and non-admin users get FORBIDDEN on the admin procedures.
- The resolver produces the documented status for every combination and never turns pending_retry into cleared or not_cleared without an AI or admin decision.
- A rejected applicant cannot start a new signup with that e-mail.

Tests:
- Vitest table test for the resolver and database tests for the procedures with the AI mock. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, the two flagged readings, and pending items.
