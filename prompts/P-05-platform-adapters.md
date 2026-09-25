Blocked by: P-03
Covers: shared base for file uploads, e-mail, and face embedding; NFR-3 (upload validation)
MVP: 2
Artifacts: apps/api/src/lib/{uploads.ts, email.ts, face-embedding.ts}, apps/api/src/routes/files.ts, packages/shared/face-models/README.md, tests
Evidence: Vitest: upload validation and authenticated reads; e-mail log mode and provider failure; embedding stub determinism

Task: implement the three small adapters other features depend on: validated file storage with an authenticated read route, the transactional e-mail wrapper, and the face embedding interface with a deterministic stub.

Context:
- Uploads: docs/04-architecture.md §6 and rules/backend.md "File uploads". Files live under UPLOADS_DIR namespaced by member id, are validated by type and size, and are served only through an authenticated route. Signup happens before any login exists (FR-9), so the write side is a library function called by public procedures, with files sent as base64 inside tRPC inputs (no multipart dependency).
- E-mail: docs/04-architecture.md §7. Delivery is never a hard dependency (FR-11), so the wrapper must not throw.
- Embedding: the signup reference embedding is computed on the backend and the kiosk computes its probe in the browser, so both must use the same model and weights (docs/04-architecture.md §5). The real implementation comes in P-22; this prompt fixes the interface and the weights location.

Permitted scope:
- Only the files in Artifacts, the route registration in the Express host, and the env additions (EMAIL_MODE, EMAIL_FROM, FACE_EMBEDDING_MODE) in the env loader and .env.example. RESEND_API_KEY is already in the loader as optional (P-01); make it required unless EMAIL_MODE is log.
- Use the global fetch for the Resend REST API. No new dependencies.

Functional requirements:
1. saveUpload({ ownerId, kind, filename, mimeType, base64 }) with kind reference_photo | exam | certificate. Allowed: JPEG and PNG for photos and certificates; JPEG, PNG and PDF for exams. Limits: 2 MB for photos, 5 MB otherwise. Sanitize filenames, write to UPLOADS_DIR/<ownerId>/<kind>/<uuid>.<ext>, reject path traversal, and return the relative path.
2. GET /files/* requires authentication: an owner reads their own exams, a user holding review_certificates reads certificates, and reference photos are never served to anyone (403). Raise the JSON body limit only for procedures that carry files.
3. sendEmail({ to, subject, text, html }) returns { ok: true } or { ok: false } and never throws. It uses RESEND_API_KEY and EMAIL_FROM; EMAIL_MODE=log writes the recipient, subject and text (which contains the link) to the logger instead of calling the provider.
4. computeFaceEmbedding(image) returns { ok: true, embedding } with 128 numbers, or { ok: false, reason: "no_face" | "multiple_faces" | "unavailable" }, and never throws. FACE_EMBEDDING_MODE=stub returns a deterministic vector derived from a hash of the bytes; real returns { ok: false, reason: "unavailable" } until P-22.
5. packages/shared/face-models/README.md states that the weights for both the kiosk and the backend live in that folder, lists the exact face-api.js files required (a face detector, the 68-point landmark net, and the face recognition net), and says where to download them. Commit no binaries.

Acceptance criteria:
- Disallowed types, oversize files, and traversal attempts are rejected with a clear error; the read route enforces the rules above.
- E-mail log mode makes no network call and a provider failure does not throw.
- The stub is deterministic and always yields 128 finite numbers.

Tests:
- Vitest for each adapter. Run only these tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
