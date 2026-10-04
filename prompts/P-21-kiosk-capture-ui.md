Blocked by: P-19, P-20
Covers: FR-30, FR-34 (as reworded by the 2026-10-04 critique, audit-log item 21: member-facing wording, front desk after three misses, inactive membership status, no names, no developer text)
MVP: 3
Artifacts: apps/web/src/app/kiosk/ (page, layout, error boundary, kiosk-panel, kiosk-status, kiosk-api, face-engine, dev-simulation and the models folder), a step that serves the model weights from packages/shared/face-models to the browser
Evidence: manual with a dev simulation: a simulated match records a check-in and shows access granted; a failing turnstile shows "Please wait" with the staff instruction; an ambiguous or rejected match asks to retry and the third miss in a row sends the person to the front desk; an inactive member shows "Membership inactive"; an API that cannot be reached shows "Check-in unavailable", told apart from "Access not available"; no result ever shows a name or a file path. Not yet done in a browser since the 2026-10-04 wording changes
Status: Partly superseded by P-31 (audit-log item 20): there is no `not_cleared` refusal any more, so the panel only distinguishes an inactive membership from any other refusal. The code still maps a 403 `not_cleared` to "Access not available" until P-31 is executed

Task: implement the kiosk screen that captures the face, computes the embedding in the browser, matches it, and reports the check-in.

Context:
- FR-30 and FR-34 in docs/02-requirements.md, the check-in flow in docs/03-features-and-flows.md (flow 3), docs/04-architecture.md §5, and rules/frontend.md "Kiosk route": the kiosk is a less-trusted surface. It only calls the embeddings endpoint and the check-in endpoint, never a route that could return a photo, and never the member or staff login.
- The matching function and the endpoints come from P-19 and P-20. The model weights live in packages/shared/face-models (P-05 README) and the backend must use the same weights (P-22).
- The kiosk key is sent from the browser by design in this academic setup (docs/04-architecture.md §5 assumes a trusted local network). Mention it in the final response.
- The kiosk is a public wall screen, so it never shows another person's name: a result carries no identity, and the check-in response does not return one either. This is a deliberate privacy choice (principle 3), not a missing feature. It also never shows developer text such as file paths or key names; those go to the browser console and, outside production only, to a small "Dev only" line.
- Wording is for the person at the door, not for a developer: short, no jargon, and every refusal ends in "see the front desk".

Permitted scope:
- Only the files in Artifacts. Allowed new dependency: face-api.js (or the maintained fork chosen for P-22, so both sides match). Justify it.
- Don't change the backend endpoints.

Functional requirements:
1. Load the weights from a static path, fetch the embeddings dataset with the kiosk key on load and refresh it every 5 minutes, and show a live camera preview.
2. Detect exactly one face, compute its 128-number descriptor in the browser, and call matchFace. On match POST /kiosk/checkins with the memberId and show a large "Access granted". On no_match or ambiguous show "Try again" without guessing. The third consecutive no_match or ambiguous result (the run resets after a recorded check-in or three minutes without a miss) shows "Please see the front desk" in the dashed form, because a run of misses is not a determination about the person.
3. When the check-in response says the turnstile failed, show "Please wait. A staff member will open the door for you." with a small staff instruction below it (the visit still counts, FR-34).
4. Refusals and failures each have their own status. A 403 with `reason: 'membership_inactive'` shows "Membership inactive. Please see the front desk." Any other refusal, including one this panel does not know yet, shows "Access not available" in the solid red form, a settled decision. A check-in request that fails (network error or a server error) shows "Check-in unavailable" in the dashed form and says nothing was recorded, so the two are never confused (principle 4). When the camera, the recognition files or the dataset are unavailable, show an "unavailable" state with a Retry button and the text "This check-in panel is not available right now. Please see the front desk." (the route error boundary says the same).
5. A 5 second cooldown after each result with a draining bar, a skeleton while the panel prepares, and large text for a wall panel.
6. Development-only controls (hidden when NODE_ENV is production): a camera or image source toggle so recognition can be tried without a camera, and a simulation select that submits a chosen memberId, listed by name through the non-production GET /kiosk/dev/members, so the check-in path can be demonstrated before real recognition works end to end.

Acceptance criteria:
- No request from the kiosk ever returns or displays a photo, and it never uses the member or staff session. No status shows a member's name.
- The outcomes (granted, retry, front desk after three misses, turnstile failed, membership inactive, access not available, check-in unavailable) each appear in the right situation.
- In a production build no developer text and no dev control is shown.

Tests:
- No component tests (rules/testing.md). Validate manually with the simulation control and the mock turnstile.

Final response:
- Respond in at most 10 lines with files created, manual steps, and pending items.
