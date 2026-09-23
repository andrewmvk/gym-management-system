Blocked by: P-02, P-05
Covers: FR-1, FR-2
MVP: 2
Artifacts: apps/api/src/modules/aptitude/{router,service,repository}.ts (signup part), packages/shared/src/schemas/signup.ts, apps/web/src/app/signup/ (basic info and photo steps)
Evidence: Vitest against Postgres: a new signup creates one row, the same e-mail resumes it without duplicates, a rejected e-mail is blocked, a registered e-mail is refused, the photo and its embedding are stored; manual: the two steps work on a phone

Task: implement the first two steps of the signup wizard: basic information with resume-by-e-mail, and the webcam reference photo.

Context:
- FR-1 and FR-2 in docs/02-requirements.md, the signup flow in docs/03-features-and-flows.md (flow 1), and the d_users columns in docs/05-data-model.md.
- No account or login exists before aptitude clearance (FR-9), so these procedures are public. The d_users id returned by the first step is the capability that identifies the applicant for the rest of the flow. Note it in the final response: anyone who knows an e-mail can resume that unfinished signup, which is acceptable for this academic scope.
- Uploads and the embedding interface come from P-05. The raw photo and the embedding are never returned to any client.

Permitted scope:
- Only the files in Artifacts and the app router registration. No new dependencies.
- Don't build the questionnaire, certificate, or password steps.

Functional requirements:
1. aptitude.startSignup({ name, phone, email, birthdate }), public and validated with a shared zod schema. If the e-mail belongs to a rejected applicant return { status: "email_blocked" }; to an unfinished signup (no password, not rejected) update the basic data and return { userId, resumed: true, nextStep }; to a registered user return { status: "already_registered" }; otherwise create the row with aptitude_status pending and return { userId }. nextStep is derived from what already exists.
2. aptitude.savePhoto({ userId, imageBase64, mimeType }), allowed only while aptitude_status is pending: store the file (kind reference_photo), call computeFaceEmbedding, and on success save reference_photo_path and reference_face_embedding. When the result is no_face or multiple_faces return { status: "photo_rejected", reason } as data, not an exception.
3. Frontend at /signup, steps 1 and 2: a basic-information form (react-hook-form, zodResolver), the resume message, webcam capture with preview and retake, an upload of the captured photo, and clear messages for a rejected photo. The userId is kept in sessionStorage. Mobile-first, errors through sonner.

Acceptance criteria:
- The three e-mail situations behave as above and never create a duplicate row.
- The stored embedding has 128 numbers and no API response contains an embedding or a photo path.
- A photo rejected by the embedding step is reported without storing an embedding.

Tests:
- Vitest against the test database with an injected embedding function to simulate no_face and multiple_faces. Screens are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
