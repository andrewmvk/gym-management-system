Blocked by: P-19, P-20
Covers: FR-30, FR-34
MVP: 3
Artifacts: apps/web/src/app/kiosk/, a step that serves the model weights from packages/shared/face-models to the browser
Evidence: manual with a dev simulation: a simulated match records a check-in and shows access granted; a failing turnstile shows the "open the turnstile manually" notice; an ambiguous or rejected match asks to retry

Task: implement the kiosk screen that captures the face, computes the embedding in the browser, matches it, and reports the check-in.

Context:
- FR-30 and FR-34 in docs/02-requirements.md, the check-in flow in docs/03-features-and-flows.md (flow 3), docs/04-architecture.md §5, and rules/frontend.md "Kiosk route": the kiosk is a less-trusted surface. It only calls the embeddings endpoint and the check-in endpoint, never a route that could return a photo, and never the member or staff login.
- The matching function and the endpoints come from P-19 and P-20. The model weights live in packages/shared/face-models (P-05 README) and the backend must use the same weights (P-22).
- The kiosk key is sent from the browser by design in this academic setup (docs/04-architecture.md §5 assumes a trusted local network). Mention it in the final response.

Permitted scope:
- Only the files in Artifacts. Allowed new dependency: face-api.js (or the maintained fork chosen for P-22, so both sides match). Justify it.
- Don't change the backend endpoints.

Functional requirements:
1. Load the weights from a static path, fetch the embeddings dataset with the kiosk key on load and refresh it every 5 minutes, and show a live camera preview.
2. Detect exactly one face, compute its 128-number descriptor in the browser, and call matchFace. On match POST /kiosk/checkins with the memberId and show a large "access granted". On no_match or ambiguous show "try again" without guessing.
3. When the check-in response says the turnstile failed, show a prominent notice telling staff to open the turnstile manually (the visit still counts, FR-34).
4. A 5 second cooldown after each result, a clear error state if the dataset or the camera is unavailable, and large text for a wall panel.
5. A development-only simulation control (hidden when NODE_ENV is production) that submits a chosen memberId, so the check-in path can be demonstrated before real recognition works end to end.

Acceptance criteria:
- No request from the kiosk ever returns or displays a photo, and it never uses the member or staff session.
- The three outcomes (granted, retry, turnstile failed) each appear in the right situation.

Tests:
- No component tests (rules/testing.md). Validate manually with the simulation control and the mock turnstile.

Final response:
- Respond in at most 10 lines with files created, manual steps, and pending items.
