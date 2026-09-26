Blocked by: none
Fixes: P-07
Covers: FR-46, RN-12
MVP: 2
Artifacts: apps/api/src/db/schema/consent.ts (f_consent_events), migration, apps/api/src/modules/aptitude/{router,service,repository}.ts, packages/shared/src/schemas/signup.ts, apps/web/src/app/signup/consent-step.tsx, apps/web/src/app/signup/signup-wizard.tsx (wire in the new step)
Evidence: Vitest against Postgres: savePhoto is refused with no recorded consent even if a valid photo is supplied; recordConsent then savePhoto succeeds; the consent row captures who, when, and which text version

Task: require and record explicit LGPD consent for biometric processing before a face embedding is ever computed.

Context:
- FR-46 in docs/02-requirements.md, RN-12 in docs/06-business-rules.md, and `f_consent_events` in docs/05-data-model.md, added after this project was already in progress (docs/09-audit-log.md, finding 12): LGPD Art. 11 requires specific, highlighted consent for biometric data, and the original spec never asked for it.
- This corrects P-07, which already implements photo capture and embedding computation. The consent check must be enforced on the backend inside `savePhoto` itself, not only by the frontend showing a screen first - a client that skips the consent step must still be refused server-side.
- `f_consent_events` is append-only (docs/05-data-model.md): a new consent is a new row, never an update to an old one.

Permitted scope:
- Only the files in Artifacts. No new dependencies.
- Don't change the questionnaire, the gender field (P-27), or anything about how the photo itself is validated once consent exists.

Functional requirements:
1. `f_consent_events` exactly as in docs/05-data-model.md.
2. `aptitude.recordConsent({ userId, consentVersion })`, public, allowed only while the applicant's `aptitude_status` is `pending`: inserts a row with `consent_type = 'biometric_facial'`. A shared constant `CONSENT_VERSION` (e.g. `'2026-09-26'`) is the single source of truth for the current text version, used by both the procedure's default and the frontend.
3. `savePhoto` checks for at least one `f_consent_events` row of type `biometric_facial` for that user before doing anything else (before even saving the uploaded file). Missing consent returns `{ status: 'consent_required' }` as data, not an exception - add this as a new `SavePhotoResult` variant alongside the existing `photo_rejected` ones.
4. A new step in the signup wizard, before the photo step: the LGPD consent text (data being collected, purpose, that it is biometric and specially protected under Art. 11) and a checkbox the applicant must tick before a "Continue" button is enabled. Continuing calls `recordConsent`, then advances to the existing photo step unchanged.

Acceptance criteria:
- Calling `savePhoto` with a valid photo but no prior `recordConsent` call returns `consent_required` and computes no embedding.
- After `recordConsent`, `savePhoto` proceeds normally.
- The stored row has the right `user_id`, `consent_type`, `consent_version`, and `consented_at`.
- The consent screen's checkbox starts unchecked; "Continue" is disabled until it is ticked.

Tests:
- Vitest against the test database extending the existing aptitude service tests, including the case where a photo is otherwise valid but consent is missing. Run only the aptitude module's tests.

Final response:
- Respond in at most 10 lines with files changed, tests run, and pending items.
