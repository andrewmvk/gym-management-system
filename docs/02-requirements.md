# Requirements

See [01-product-overview.md](./01-product-overview.md) for roles and context.

## 1. Functional Requirements

### 1.1 Signup & Aptitude Gate
- FR-1: A prospective member can submit basic signup info: name, phone number, email, birthdate. If a `d_users` row already exists for that e-mail without a password set and not finally rejected, the flow resumes from that row instead of creating a duplicate.
- FR-2: As part of signup, the member captures a reference photo (webcam). The backend computes a face embedding from it; the embedding is what's used for later recognition, and the raw photo is retained server-side only (audit/recompute), never distributed to any client.
- FR-3: The member completes a digital aptitude/health questionnaire before their signup can be finalized.
- FR-4: The AI evaluates the questionnaire and returns one of: `cleared`, `not_cleared`, or `pending_retry` (the AI service is temporarily unavailable/erroring - a distinct technical state, never coded as a real clinical decision). A `pending_retry` result is only re-evaluated when the member reopens the page or explicitly requests a re-check - there is no background job retrying it automatically.
- FR-5: If the result is `not_cleared` (or `pending_retry` persists), the member must upload a medical certificate for AI review, which likewise returns `cleared`, `not_cleared`, or `pending_retry`.
- FR-6: Every certificate result - `cleared`, `not_cleared`, and `pending_retry` alike - is routed to the Gym Admin's backstop review queue, not only results the AI is uncertain about.
- FR-7: An Admin can confirm or override a certificate's result. Overriding an AI `not_cleared` to `cleared` is the only recovery path available to a member the AI wrongly rejected, since no account exists yet and they cannot log in to contest it themselves.
- FR-8: A member whose result is confirmed `not_cleared` (by AI or by Admin) cannot complete signup - no account/password is ever created for them. That e-mail stays permanently associated with the rejected record and can never be used to start a new signup.
- FR-9: Once cleared (by AI or by Admin override), the member immediately sets a password and gains authenticated access to their account. Authentication is only available after this point - there is no login before aptitude clearance.
- FR-45: During signup, the member may optionally report their gender, used only to inform AI-generated training plan recommendations. It is never required to complete signup.
- FR-46: Before the backend computes a face embedding from the signup reference photo (FR-2), the member must give explicit, specific consent for biometric data processing (LGPD Art. 11 - a generic terms-of-use acceptance is not sufficient). Consent is recorded permanently - who, when, and which version of the consent text was shown - and an embedding is never computed without a recorded consent for that member.

### 1.2 Onboarding (post-authentication)
- FR-10: Upon aptitude clearance, the system sends the member an email containing a link to the onboarding form.
- FR-11: The onboarding form is also a normal page inside the authenticated app, not only reachable via the emailed link. If a member logs in without having completed onboarding, they are redirected there automatically - so a lost, typo'd, or spam-filtered email is never a dead end.
- FR-12: The onboarding form lets the member submit: attached exam files, medications, physical conditions/limitations, goals/pretensions, and any other free-form relevant info.
- FR-13: Onboarding data is stored and used as the primary input for the member's first AI-generated training plan.
- FR-14: Onboarding is not strictly one-time - a member can add/update this information later (via the AI chat, see 1.4).

### 1.3 Training Plans & Exercise/Equipment Catalog
- FR-15: The AI generates a training plan for the member using onboarding data plus all accumulated historical/state data.
- FR-16: Training plans are composed of exercises selected from a curated, structured exercise library (not free-text), enabling per-exercise and per-equipment metrics.
- FR-17: Each exercise is linked to zero or more pieces of gym equipment. An exercise is only includable in a plan if it requires no equipment (bodyweight) or at least one of its linked equipment items is currently marked available. This must be checked both when generating a new plan and when the AI/member views whether an existing plan's exercises are still performable.
- FR-18: A generated plan is published and visible to the member immediately (no blocking trainer approval step).
- FR-19: Any trainer (shared pool, not a 1:1 assignment) can view any member's plan and leave a comment/note or edit/override it, at any time. Multiple trainers may each leave their own notes over time - a later trainer's note never overwrites an earlier one; all are retained as a history.
- FR-20: The member can view their plan for the current day and browse their full historical plan record by date.
- FR-21: The member (via chat) can request/trigger a plan adjustment for a given date - past (retroactive correction, e.g. "I didn't do X") or future (e.g. changing today's or an upcoming day's plan).
- FR-22: If the AI is about to regenerate a plan for a date that already carries a trainer's direct edit, the member must first be shown a warning that regenerating will replace the trainer's edit, and must confirm before it proceeds.
- FR-23: A retroactive correction directly overwrites that date's historical plan/exercise record - this is intentional (that is what "correction" means here), not a versioned/append-only history. Metrics (FR-36) always reflect the corrected version.
- FR-24: The Admin manages the exercise/equipment catalog: can add new exercises and add new gym equipment, and can toggle whether a piece of equipment is currently available. Admin cannot delete an exercise - exercises are add-only, so historical plans always resolve against a valid exercise.

### 1.4 AI Chat Assistant
- FR-25: The member can converse with an AI assistant at any time; the assistant has access to the member's full profile, onboarding data, and history as context, assembled fresh on every request (no server-side conversation/session object).
- FR-26: The chat UI itself does not need to persist/replay a visible conversation thread across sessions (no session management required).
- FR-27: Every chat message is processed to extract structured, durable facts (e.g., skipped exercise, new injury, medication change, reported life event like playing soccer, updated physical state) which are saved permanently to the member's profile/history.
- FR-28: The AI can give feedback informed by this history (e.g., flag risk from an old injury given current exercises, adapt a plan because the member reports having played soccer).
- FR-29: If the member asks, the AI can factor in aggregate info about other members' plans for the day (e.g., "what is everyone else doing today") when adapting that member's plan.

### 1.5 Facial Recognition Check-in
- FR-30: A kiosk-style web app (running at the gym's physical panel) captures a photo via webcam and computes its face embedding client-side.
- FR-31: The kiosk performs 1:N matching against embeddings only. It fetches a dataset of `{memberId, embedding}` pairs from a dedicated, kiosk-authenticated backend endpoint - raw reference photos are never sent to or stored on the kiosk.
- FR-32: Matching applies a similarity/distance threshold to decide whether there's a match at all. If the best and second-best candidates are both above threshold and too close to call (ambiguous), the match is rejected and the member is asked to retry, rather than guessing between them.
- FR-33: On an accepted match, the backend attempts to call the gym's existing external turnstile REST API to unlock the turnstile. Whether that call succeeds or fails, the check-in itself is always recorded, tagged with the outcome (`success`/`failed`).
- FR-34: If the turnstile API call fails/times out, the kiosk surfaces the failure so gym staff can open the turnstile manually - the visit is still counted as a check-in regardless.
- FR-35: An Admin has a settings area to input/configure the values needed to call the external turnstile REST API (base URL, credentials/API key, field mappings) - the API itself is not built by this project.

### 1.6 Metrics & Gym Info
- FR-36: The member can view personal metrics: training frequency, days trained, exercises performed (breakdown), training volume, and progress toward stated goals/pretensions. "Days trained"/training frequency counts distinct calendar days with at least one recorded check-in (`f_check_ins`) - a day where only plan exercises were marked completed without a physical check-in does not count.
- FR-37: There is no checkout event anywhere in the system. "Current occupancy" is an estimate, computed as the count of check-ins within a trailing rolling time window (e.g. the last 90 minutes) as of now - it is explicitly framed as an estimate, not an exact live headcount.
- FR-38: The gym info area also shows, computed from seeded data: whether the gym is currently open, and which muscle groups/equipment are in demand today (an exercise only counts toward equipment demand if at least one of its linked equipment items is available, per FR-17).
- FR-39: All "today"/date logic (plan dates, the occupancy window, gym open/closed hours) uses the server's local system timezone consistently - there is no per-user timezone handling.

### 1.7 Membership, Staff Accounts & Access Policies
- FR-40: Each member has a mocked membership status field (e.g. active/inactive, plan tier). No real payment processing is implemented.
- FR-41: Trainer and admin accounts are never created through a self-service signup flow. A seed script creates a fixed set of demo trainer/admin accounts with known credentials at first boot; there is no staff registration UI anywhere in the app. This is about account *creation* only - it does not restrict how an existing account's permissions can change afterward (see FR-43).
- FR-42: Every user's permissions are derived from the set of granular access policies currently granted to them (`d_user_policy` rows referenced via `f_user_policy_on_user`, see [05-data-model.md](./05-data-model.md)) - there is no fixed role field. A user with no active grant for a given permission cannot perform the action it covers, regardless of who they are.
- FR-43: A user holding the appropriate policy-management permission (e.g. an Admin) can view every defined policy and every user's current grants, and can grant or revoke any policy - including the trainer or admin policy set - on any existing user. This only changes what an existing account can do; it never creates a new account, so FR-41's "no staff self-signup" boundary still holds.
- FR-44: The aptitude/onboarding gate (FR-1–FR-14) and the member-only application area apply only to a user holding the member-designated policy grants. A seeded trainer/admin account never receives these grants, so it's exempt from the gate and lands directly in the staff area instead.

## 2. Non-Functional Requirements

Kept intentionally minimal, given this is an academic, non-deployed project:

- NFR-1: **Responsive** - usable on mobile and desktop viewports (the member-facing app in particular must work well on phones).
- NFR-2: **Reasonable performance** - no specific benchmark targets; standard SPA/SSR responsiveness is sufficient.
- NFR-3: **Basic security hygiene** - passwords hashed, authenticated routes actually protected (JWT verified server-side), the auth cookie is `httpOnly` and `sameSite=lax` always, and `Secure` whenever `NODE_ENV=production` (off for local Docker Compose demo runs, since `Secure` cookies are dropped over plain HTTP), file uploads validated by type/size, secrets kept out of source control (`.env`, not committed).
- NFR-4: **No accessibility (WCAG), offline, i18n, or scale requirements** - explicitly out of scope.
- NFR-5: **No SLA/uptime requirement** - the system only needs to run reliably for local development/demo via Docker Compose.
- NFR-6: **No password-reset/account-recovery flow** - explicitly out of scope; a forgotten password is a non-issue for this academic demo.

## 3. Permitted Scopes (In / Out of Scope)

### In Scope
- Full signup → aptitude → onboarding → authenticated account flow, including the Admin backstop review of every certificate result.
- Real facial embedding computation (e.g. face-api.js or similar): on the backend for the signup reference photo, in the browser at the kiosk. Only embeddings - never raw photos - are distributed to the kiosk.
- A face-match confidence threshold with a basic tie-break/ambiguity check.
- Admin-configurable integration point for an external (pre-existing, not built here) turnstile REST API, with check-ins always recorded independent of that call's success/failure.
- AI-generated, AI-adjustable training plans backed by a curated, add-only exercise library and an equipment availability model (N:N exercises↔equipment).
- A conflict check/warning before the AI overwrites a trainer-edited plan.
- AI chat that extracts and persists structured facts into member history (no persisted visible chat log).
- Trainer review/override with a retained multi-trainer note history (shared pool, not 1:1 assignment).
- Personal metrics and gym-wide aggregate info (occupancy via rolling window, equipment/muscle-group demand), computed from seeded data.
- Real transactional email sending for the onboarding invite link (e.g. via Resend).
- Basic mocked membership/billing status field per member.
- Seeded, fixed-credential demo trainer/admin accounts.
- Explicit, recorded LGPD consent for biometric processing before a face embedding is ever computed.

### Out of Scope
- Real payment processing, invoicing, or subscription billing logic.
- Building or modifying the turnstile's REST API itself - it is treated as an existing external system.
- Persisting/displaying a full scrollable AI chat conversation log (only the extracted structured facts are durable).
- Multi-location/multi-tenant support.
- 1:1 member–trainer assignment logic.
- Real biometric data from real people, and any biometric data leaving the mocked/seeded dataset.
- A real checkout/exit-tracking flow - occupancy is a rolling-window estimate, not an exact count.
- Deleting exercises from the catalog, or any staff self-signup UI.
- Password reset/account recovery.
- Accessibility compliance, internationalization, offline support, per-user timezone handling.
- Production-grade infra concerns (autoscaling, CDN, uptime monitoring, real object storage, hardened kiosk network boundary) - local Docker Compose is the target environment.
