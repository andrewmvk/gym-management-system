Blocked by: P-03, P-19
Covers: FR-33, FR-35
MVP: 3
Artifacts: apps/api/src/db/schema/checkins.ts (f_check_ins and d_turnstile_config), migration, apps/api/src/modules/turnstile/{service,router,repository}.ts, POST /kiosk/checkins, apps/web/src/app/(staff)/settings/turnstile/
Evidence: Vitest with a local mock HTTP server: every turnstile failure mode still records exactly one check-in tagged failed (RN-09) and success is tagged success; the config is masked on read and only an admin can change it

Task: implement the turnstile integration, the always-recorded check-in, and the admin settings page for the integration.

Context:
- FR-33 and FR-35 in docs/02-requirements.md, docs/05-data-model.md (f_check_ins, d_turnstile_config), rules/database.md (singleton rows through a getOrCreate method), rules/error-handling.md, and rule RN-09 in docs/06-business-rules.md: a failed turnstile call is data (turnstile_status failed) and never prevents the check-in row.
- The external turnstile API is treated as pre-existing and unknown. The request shape is driven entirely by the admin-editable field mapping.
- The kiosk middleware comes from P-19.

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.
- Don't build the kiosk screen (P-21).

Functional requirements:
1. f_check_ins and d_turnstile_config as in docs/05-data-model.md, with a repository getOrCreate for the singleton config.
2. turnstile service unlockTurnstile({ memberId }): read the config, build a POST from base_url, the api key header and field_mapping, time out after 5 seconds, and return { status: "success" | "failed", response, error? }. It never throws; an incomplete config returns failed with reason not_configured. Never log the api key.
3. POST /kiosk/checkins guarded by requireKioskKey, body { memberId }: validate that the member exists and is cleared, call unlockTurnstile, and always insert one f_check_ins row with turnstile_status and turnstile_response. Respond with { checkInId, turnstileStatus } (the kiosk shows the staff notice, FR-34, in P-21).
4. turnstile.getConfig (masked api key, last four characters only) and turnstile.updateConfig({ baseUrl, apiKey?, fieldMapping }) guarded by manage_turnstile_config, recording updated_by_user_id. A blank apiKey keeps the current one. Validate the URL and the mapping with zod. Store the key as is (data is mocked) and mention in the final response that the doc's "consider encrypting" remains open.
5. Staff page (staff)/settings/turnstile: base URL, api key (password field showing the masked value), and a field-mapping JSON editor with validation. Explicit loading, error and success states.

Acceptance criteria:
- Success, non-2xx, timeout, network error and not_configured each create exactly one check-in row with the right tag.
- The config stays a single row; a non-admin gets FORBIDDEN.

Tests:
- Vitest against the test database and a local mock HTTP server, including the RN-09 table. The page is validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
