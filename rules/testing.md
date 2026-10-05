# Testing

`docs/02-requirements.md` doesn't mandate a test suite (academic, non-deployed scope) - testing effort here is deliberately scoped to high-value business logic, not exhaustive coverage.

## Tooling

Vitest only. No component-testing library, no Playwright/e2e. Verify user-facing flows manually against the running Docker Compose stack instead.

## What gets tests

Pure, easy-to-get-subtly-wrong logic with no UI:

- Inactive membership (FR-40, RN-15): login refused only after a correct password, an existing session stopping, and the kiosk refusing with no turnstile call and no check-in row.
- Completed exercises preserved (RN-16): regenerating or trainer-editing a plan keeps `completed` for exercises that remain, and asks for confirmation first when ticks exist.
- AI failure saves no plan (FR-15, RN-01): a live AI that returns nothing usable fails the generation with the unavailable error and writes no plan row, never falling back to the placeholder.
- Exercise availability rule (FR-17): no-equipment-needed OR ≥1 linked equipment available.
- Occupancy rolling-window query counting distinct members (FR-37).
- Face-match threshold/ambiguity decision (best vs. second-best candidate).
- Retroactive correction overwrite behavior (FR-23) and that metrics reflect the corrected version.
- Turnstile-call-failure still records a check-in, tagged `failed` (FR-33/34).
- The incremental JSON reader (`ai/json-stream.ts`): the same events however the text is split (including inside an escape), a string value streamed as deltas, an array item reported only once it closes, a code fence and trailing text ignored, braces inside strings not changing nesting, malformed input stopping quietly.
- The streaming runner and its tool loop (`streamStructured`): events forwarded as the answer arrives, a tool turn held back and answered from the tool result, a failed lookup reported to the model, one retry only when nothing reached the caller, and `unavailable` as data on a failed request. Use a mocked `fetch` that returns a real server-sent-event body.
- Proposals (FR-63, FR-65, RN-18): a proposal is rebuilt on the server (diff against the saved plan, catalog ids and availability checked, duplicates dropped, a past day with no plan falling back, a no-op dropped, focus changes only when different), and the injury conflict is computed from the member's own facts whatever the AI said (`coach-draft.ts` and the chat service).
- Apply guards (FR-21, FR-22, FR-67, RN-22): `chat.applyDraft` refuses an unavailable or repeated exercise, returns `needs_acknowledgement` for an unaccepted injury warning and `needs_confirmation` for a trainer edit or ticks, keeps ticks of exercises that stay, writes the `f_plan_changes` row with the accepted warnings, and applies focus changes through the focus module.
- Pending facts (FR-27, FR-72, RN-21): an injury or a medication change is stored unconfirmed, is absent from prompts and from staff views, appears after confirmation (optionally edited) and is listed nowhere after a dismissal; any other fact is stored confirmed at once and reaches the next prompt; active injuries list only confirmed, unresolved, muscle-tagged injuries.
- Plan memory (FR-66): a proposal carries a memory note (the server writes one when the coach gave none), a request for a plan is not stored as a fact while a proposal is emitted, the draft's note reaches the next prompt, and `chat.applyDraft` stores one confirmed `plan_adjustment_request` with that note (the request when there is none).
- Lenient proposals (FR-65): numbers written as text, a missing date or summary and one exercise that does not exist do not drop the proposal, and a proposal the server cannot use is reported to the member in the reply.
- The member's manual edit (FR-68): numbers saved, a confirmed `manual_plan_edit` fact and a `member_edit` change written, nothing written when unchanged, a past plan and another member's exercise refused.
- Risk flag (FR-71, RN-20): an accepted warning makes the plan must-review in the queue, the Overview and the plan detail, and a later trainer note clears it while the change stays logged.
- Streams (RN-19): the order of events of `plans.generateToday` and `onboarding.submit`, that a failing generation still saves the submission and no plan, and the one HTTP test (`trpc/streaming.test.ts`) that proves a yielding procedure reaches a real tRPC streaming client through the Express adapter.
- Effective-permission resolution (FR-42): building a user's CASL ability from `f_user_policy_on_user`/`d_user_policy` and from group memberships (`f_user_policy_group_on_user`) correctly excludes expired grants and memberships, applies `denied` as an override (including over a policy that arrives through a group), and translates `scope: 'self'` into the right condition - a subtle bug here silently grants or denies the wrong thing.

## Conventions

- Test files co-located next to the code under test: `plan-service.ts` + `plan-service.test.ts` in the same folder - not a parallel `__tests__` tree.
- Mock only the true external boundary: OpenRouter, the turnstile REST API, the email provider. Don't mock the database - tests needing DB state run against a real Postgres instance (a test database, not the dev one), so a query bug can't hide behind a mock that quietly diverges from real behavior.
