Blocked by: P-05
Covers: the real implementation behind the signup embedding interface (upgrade of the stub)
MVP: 3
Artifacts: apps/api/src/lib/face-embedding.ts (real mode), packages/shared/face-models/README.md updates, tests
Evidence: Vitest: a blank image returns no_face, the same bytes give the same descriptor, and the vector has 128 finite numbers; the chosen library and backend are documented

Task: implement FACE_EMBEDDING_MODE=real on the backend with the same model the kiosk uses.

Context:
- docs/04-architecture.md §5: the signup reference embedding is computed on the backend and the kiosk computes its probe in the browser. Vectors from different models or weights are not comparable, so the match would silently fail.
- The interface, the stub, and the weights folder come from P-05. The real mode must keep the same function signature so no caller changes.
- Neither teammate has computer vision experience, so keep the choice simple and document it.

Permitted scope:
- Only the files in Artifacts. Choose the face-api.js variant and TensorFlow backend that installs cleanly on Windows and inside the backend container (a WASM or pure JavaScript backend is acceptable even if slower). Justify each new dependency and record the choice in the README.
- Don't commit weight binaries or real people's photos: the project never uses real biometric data (docs/01-product-overview.md).

Functional requirements:
1. In real mode load the weights from packages/shared/face-models once, lazily, detect faces in the image, and return no_face for zero faces, multiple_faces for more than one, and the 128-number descriptor for exactly one.
2. Any load or inference failure returns { ok: false, reason: "unavailable" } without throwing.
3. State in the README which weights and library version both the backend and the kiosk must use.

Acceptance criteria:
- The three outcomes are produced correctly on generated fixture images; missing weights yield unavailable and not a crash.
- Switching FACE_EMBEDDING_MODE between stub and real needs no code change elsewhere.

Tests:
- Vitest with generated fixtures (a blank image, and a synthetic image if a licensed sample is provided by the team). Tests that need the weights are skipped with a clear message when the weights are absent.

Final response:
- Respond in at most 10 lines with files changed, the library choice, tests run, and pending items.
