Blocked by: P-03, P-19
Covers: FR-33, FR-35
MVP: 3
Artifacts: apps/api/src/db/schema/checkins.ts (f_check_ins and d_turnstile_config), migration 0007, apps/api/src/modules/turnstile/{service,router,repository}.ts (+ router test, testConnection), apps/api/src/modules/checkins/{service.ts, service.test.ts} and the new POST /kiosk/checkins in kiosk-routes.ts (+ tests), packages/shared/src/schemas/turnstile.ts, apps/web/src/app/(staff)/settings/turnstile/{page,turnstile-settings}.tsx, apps/web/src/lib/navigation.ts (nav entry)
Evidence: Vitest with a local mock HTTP server: every turnstile failure mode still records exactly one check-in tagged failed (RN-09) and success is tagged success; the saved method, url, headers and body reach the server; the config is masked on read and only an admin can change or test it

Task: implement the turnstile integration, the always-recorded check-in, and the admin settings page for the integration.

Context:
- FR-33 and FR-35 in docs/02-requirements.md, docs/05-data-model.md (f_check_ins, d_turnstile_config), rules/database.md (singleton rows through a getOrCreate method), rules/error-handling.md, and rule RN-09 in docs/06-business-rules.md: a failed turnstile call is data (turnstile_status failed) and never prevents the check-in row.
- The external turnstile API is treated as pre-existing and unknown. Real lock and turnstile APIs differ in method (GET, POST or PUT), path, auth (a header, a query key, a bearer token) and body, but all of them open a door rather than a person. So the integration is one admin-editable request template: method, URL, headers and an optional body, not a fixed request shape.
- The kiosk middleware comes from P-19.

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations (app-router.ts). No new dependencies.
- Don't build the kiosk screen (P-21).

Functional requirements:
1. f_check_ins and d_turnstile_config as in docs/05-data-model.md, with a repository getOrCreate for the singleton config.
2. turnstile service unlockTurnstile({ memberId }): read the config and send its method, url and headers, plus its body_template when the method is not GET with {{memberId}} and {{timestamp}} filled in. Time out after 5 seconds, treat any 2xx as success, and return { status: "success" | "failed", response, error? }. It never throws; a config without a url returns failed with reason not_configured. Never log header values or the url. turnstile.testConnection sends the saved request for real (admin only) and returns the same result without recording a check-in.
3. POST /kiosk/checkins guarded by requireKioskKey, body { memberId }: validate that the member exists and is cleared, call unlockTurnstile, and always insert one f_check_ins row with turnstile_status and turnstile_response. Respond with { checkInId, turnstileStatus } (the kiosk shows the staff notice, FR-34, in P-21).
4. turnstile.getConfig and turnstile.updateConfig({ method, url, headers, bodyTemplate }) guarded by manage_turnstile_config, recording updated_by_user_id. Headers are { name, value, secret }. On read, secret header values and the url's query-string values show only a mask plus their last four characters; a masked value sent back unchanged keeps the stored one. Validate with zod (http or https url, valid and unique header names, at most 10 headers, no body on GET, only the two known placeholders). Store secrets as is (data is mocked) and mention in the final response that the doc's "consider encrypting" remains open.
5. Staff page (staff)/settings/turnstile: method and url, a headers list with a secret switch per row, an optional body, a Save button and a "Test connection" button (enabled only for the saved settings, with a warning that it opens the turnstile). Skeleton loading (a per-page skeleton inside GuardedContent, built from components' .Skeleton; rules/frontend.md "Loading states"), explicit error and success states, and the test result shown on the page.

Acceptance criteria:
- Success, non-2xx, timeout, network error and not_configured each create exactly one check-in row with the right tag.
- The config stays a single row; a non-admin gets FORBIDDEN, on testConnection too.
- The simplest configuration, a method and a url with no headers and no body, works.

Tests:
- Vitest against the test database and a local mock HTTP server, including the RN-09 table. The page is validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
