Blocked by: P-02, P-05
Covers: FR-31, FR-32
MVP: 3
Artifacts: apps/api/src/modules/checkins/kiosk-routes.ts (kiosk key middleware and embeddings endpoint), packages/shared/src/faces/{match.ts, match.test.ts}
Evidence: Vitest: the endpoint rejects a missing or wrong key and returns only { memberId, embedding }; the matching function rejects an ambiguous top-two instead of guessing (RN-08)

Task: implement the kiosk-authenticated embeddings dataset endpoint and the pure 1:N matching decision.

Context:
- FR-31 and FR-32 in docs/02-requirements.md, docs/04-architecture.md §5, rules/backend.md (the kiosk is a separate trust boundary gated by KIOSK_API_KEY and must not reuse the user ability middleware), and rule RN-08 in docs/06-business-rules.md.
- Embeddings are 128-number vectors compared by Euclidean distance (face-api.js convention).

Permitted scope:
- Only the files in Artifacts and the route registration. No new dependencies.

Functional requirements:
1. requireKioskKey middleware: the x-kiosk-key header must equal KIOSK_API_KEY, compared in constant time. Export it for reuse by P-20.
2. GET /kiosk/embeddings returns [{ memberId, embedding }] only for users that are cleared, have a password, and have an embedding. It returns no photo, name, or other field.
3. packages/shared/src/faces/match.ts exports DEFAULT_MATCH_THRESHOLD = 0.6, DEFAULT_MATCH_MARGIN = 0.1 and matchFace(probe, gallery, options?), returning { status: "match", memberId, distance }, { status: "ambiguous" } or { status: "no_match" }. The best candidate must be at or under the threshold; if the second best is also under the threshold and the gap is smaller than the margin, the result is ambiguous. An empty gallery is no_match, and a vector of the wrong length throws a TypeError. The function is pure and does not import face-api.js.

Acceptance criteria:
- The endpoint answers 401 without the right key and never includes rejected or pending users.
- matchFace gives the right status for: empty gallery, best above the threshold, one clear match, two close candidates, two far-apart candidates, and a single candidate under the threshold.

Tests:
- Vitest for the middleware and endpoint against the test database, and a table-driven test for matchFace. Run only these tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
