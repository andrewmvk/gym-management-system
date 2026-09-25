# Technical Architecture

## 1. Stack Overview

| Layer | Choice |
|---|---|
| Language and tooling | TypeScript 7 (the native compiler) in every workspace, pnpm workspaces |
| Frontend framework | Next.js, TypeScript (`.tsx`) |
| Styling / UI | Tailwind CSS + shadcn/ui |
| Backend framework | Node.js + Express (tRPC HTTP adapter) |
| API layer | tRPC (end-to-end typed, shared types between frontend and backend) |
| ORM | Drizzle |
| Database | PostgreSQL |
| Auth | Custom JWT, delivered via httpOnly cookie (identity only - no role claim) |
| Authorization | CASL (`@casl/ability` on both apps, `@casl/react` on the frontend), policy-driven via `d_user_policy`/`f_user_policy_on_user` (see §11) - no fixed role field |
| File storage | Local disk via Docker volume (path/URL stored in Postgres) |
| AI provider | OpenRouter API, using a free-tier model (configurable) |
| Email | Real transactional provider (e.g. Resend) for the onboarding invite link |
| Face recognition | Face detection/embedding library (e.g. face-api.js). The signup reference embedding is computed on the backend; the kiosk computes its probe embedding in the browser and runs the 1:N match against the embedding dataset. Both sides must use the same model and weights (see §5) |
| Containerization | Docker Compose: two containers, `frontend` and `backend` (the Node API and PostgreSQL run together in the second one). This split is a course requirement |

## 2. Container Architecture

```mermaid
flowchart LR
    subgraph Frontend Container
        FE[Next.js app<br/>Tailwind + shadcn/ui]
    end
    subgraph Kiosk Client
        KIOSK[Kiosk web app<br/>face-api.js runs here<br/>holds embeddings only, never photos]
    end
    subgraph Backend + DB Container
        BE[Node.js + Express<br/>tRPC router<br/>Drizzle ORM<br/>face embedding at signup]
        PG[(PostgreSQL)]
        VOL[(Docker volume<br/>/uploads)]
        BE --- VOL
    end
    FE -- tRPC over HTTP, JWT cookie --> BE
    KIOSK -- fetch embeddings dataset<br/>KIOSK_API_KEY --> BE
    KIOSK -- report matched memberId --> BE
    BE -- SQL via Drizzle --> PG
    BE -- REST call --> EXT[External Turnstile REST API<br/>(pre-existing, admin-configured)]
    BE -- API call --> AI[OpenRouter API<br/>free model]
    BE -- API call --> MAIL[Email provider<br/>e.g. Resend]
```

Two containers are orchestrated via `docker-compose.yml`: `frontend`, and `backend`, which runs both the Node API and PostgreSQL (one container for the front and one for the back plus database, as the course requires). The two processes in the second container are started by an entrypoint script or a process supervisor; the exact mechanism is an implementation detail of the base setup. The kiosk is the same Next.js frontend app running in a dedicated route/mode (not a third container), but is conceptually a separate, less-trusted client since it's the one physically exposed at the gym panel. The backend container mounts a volume for uploaded files (reference photos, exam attachments, medical certificates) and one for the PostgreSQL data directory.

This is a decoupled architecture (frontend and backend are separate deployables), which is why tRPC is used over plain Next.js API routes - it preserves end-to-end type safety across the network boundary between the two containers, and the frontend/backend still share TypeScript types (e.g. via a shared package or by importing the backend's router type).

## 3. Authentication Flow

1. Member/trainer/admin logs in via a tRPC mutation on the backend.
2. Backend verifies credentials (bcrypt-hashed password), issues a signed JWT containing `{ userId }` - no role. Permissions are never embedded in the token; they're resolved fresh from the database on every request (see §11).
3. JWT is set as a cookie with `httpOnly` and `sameSite=lax` always on; `Secure` is set conditionally - only when `NODE_ENV=production`. Local Docker Compose demo runs use plain HTTP, and a `Secure` cookie would silently never be sent/set by the browser in that case, so it must not be hardcoded on.
4. Frontend includes credentials on every tRPC request (`fetch` with `credentials: 'include'`); CORS on the backend must allow the frontend's origin with credentials.
5. Backend tRPC context middleware verifies the JWT on every request, attaching `{ userId }` to `ctx`, then builds a CASL `Ability` for that user from their active policy grants (§11) and attaches it as `ctx.ability`. Procedures check `ctx.ability.can(operation, resource)` as needed - there is no role to branch on.
6. No login/authenticated route exists before aptitude clearance (see FR-9) - the JWT is only issued once an account exists and has a password set.
7. Trainer/admin accounts are never created via a login-adjacent signup mutation - they only exist via the seed script (see §8). An existing account's policies (including whether it holds the trainer/admin policy set) can later change through the Admin policy-management feature (FR-43) without ever creating a new account.

## 4. AI Integration

- All AI calls (aptitude questionnaire evaluation, medical certificate review, training plan generation/adjustment, and the chat assistant) go through the **backend**, never directly from the frontend - this keeps the OpenRouter API key server-side only.
- The specific free model is configurable via an environment variable (e.g. `OPENROUTER_MODEL`), since OpenRouter's free-model lineup changes over time; the code should not hardcode a specific model id in business logic.
- Each AI call is a **stateless request** built from context assembled server-side each time: the member's profile, onboarding data, structured history/fact log, and (for plan generation) the curated exercise/equipment catalog. There is no server-side conversation/session object for the chat - this matches FR-25/FR-26.
- Chat responses are expected to return two things: the natural-language reply for the member, and any structured facts to persist (e.g. via a JSON-mode/function-calling style response) - this structured extraction is what feeds FR-27.
- **Failure handling**: OpenRouter's free tier is rate-limited and can be unreliable. Any transient failure, timeout, or rate-limit response from a questionnaire/certificate evaluation call must be coded as `pending_retry` - a distinct technical state - never silently surfaced as a crash, and never coalesced into `cleared`/`not_cleared` (which would misrepresent a real clinical determination). The same failures on a chat/plan-generation call should surface as a normal "AI is temporarily unavailable, try again" error to the member rather than a raw exception.

## 5. Face Recognition & Embedding Distribution

- Reference photos captured at signup are processed **on the backend** into a face embedding (a fixed-length numeric vector) using the recognition library's embedding model; the browser only captures and uploads the photo at signup. The raw photo is stored only on the backend's upload volume for audit/recompute purposes and is **never** sent to the kiosk or any other client.
- The kiosk computes its probe embedding in the browser, so the backend and the browser must run the same embedding model with the same weights (for face-api.js, the same face recognition net producing 128-dimensional descriptors). Vectors from different models or versions are not comparable, and the match would silently fail.
- The kiosk fetches only the embedding dataset (`{ memberId, embedding }` pairs, no images) from a dedicated backend endpoint gated by a static `KIOSK_API_KEY`, rather than being open to arbitrary callers.
- Matching uses a similarity/distance threshold to decide "is this a match at all," plus a margin check between the best and second-best candidate to reject ambiguous ties - the member is asked to retry rather than the system guessing (FR-32).
- This reduces exposure relative to shipping raw photos, but the full embedding dataset is still present in the kiosk's browser memory/network traffic; the kiosk is assumed to run on a trusted, non-public local network for this academic project - a real deployment would need a more hardened kiosk boundary (explicitly out of scope here, see [02-requirements.md](./02-requirements.md)).

## 6. File Storage

- Uploads (signup reference photo, exam attachments, medical certificates) are written by the backend to a mounted Docker volume (e.g. `/app/uploads`), namespaced by member id.
- Only the relative path (or a served URL) is stored in Postgres; the backend serves/proxies file reads through an authenticated route rather than exposing the volume directly.
- The computed face embedding (not the photo) is what's cached in Postgres and is the only biometric artifact ever served outward, to the kiosk endpoint above.

## 7. Email

- Onboarding invite emails are sent via a real transactional email API (e.g. Resend) called from the backend once aptitude clearance completes.
- Requires an API key stored as a backend environment variable; sender domain/config is out of scope of correctness concerns since this is a non-deployed academic project (a sandbox/testing sender is acceptable).
- The onboarding page is also reachable directly inside the app (FR-11), so email deliverability isn't a hard dependency for completing onboarding.

## 8. Seed Data & Bootstrapping

- A database seed script, run at first boot, first creates the full set of `d_user_policy` rows the app needs, then creates a fixed set of demo trainer and admin `d_users` rows with known credentials and grants each its staff-designated policies (documented in the project README) - this is the *only* way trainer/admin accounts and their access come into existence; there is no staff registration UI (FR-41), and beyond this seed the only other way an existing account's policies change is the Admin policy-management feature (FR-43).
- The same seed script populates the initial exercise/equipment catalog and a batch of fake seeded members (with their member-designated policy grants), check-ins, and plans so that occupancy/equipment-demand metrics have realistic data to show in a demo (see [02-requirements.md](./02-requirements.md), Permitted Scopes).

## 9. Environment Variables (indicative)

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string (Drizzle) |
| `TEST_DATABASE_URL` | backend tests | Separate test database in the same local PostgreSQL, created by the backend entrypoint; tests truncate it freely |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | backend container | Credentials and database name the entrypoint initializes PostgreSQL with; compose builds the in-container `DATABASE_URL` from them |
| `API_PORT` | backend | Port the API listens on (4000) |
| `WEB_ORIGIN` | backend | The web app URL: the only origin CORS allows with credentials, and the base for links in e-mails |
| `SEED_TRAINER_PASSWORD` / `SEED_ADMIN_PASSWORD` | backend (seed) | Passwords of the fixed demo trainer and admin accounts the seed creates |
| `JWT_SECRET` | backend | Signing secret for auth JWTs |
| `NODE_ENV` | backend | Gates the `Secure` cookie flag (production only) |
| `OPENROUTER_API_KEY` | backend | AI provider auth |
| `OPENROUTER_MODEL` | backend | Selected free model id |
| `RESEND_API_KEY` | backend | Email provider auth |
| `UPLOADS_DIR` | backend | Path inside container to the mounted uploads volume |
| `KIOSK_API_KEY` | backend + kiosk client | Authenticates the kiosk's fetch of the face-embedding dataset |
| `TURNSTILE_API_*` | backend (DB-backed, admin-editable) | Not a static env var - configured at runtime by whoever holds the turnstile-config permission and stored in the `d_turnstile_config` table, since it must be editable without a redeploy |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL for tRPC client |

## 10. Notable Architectural Decisions & Rationale

- **tRPC over REST/GraphQL**: chosen for type-safety across the frontend/backend boundary despite them being separate containers - avoids hand-written request/response types drifting out of sync.
- **Drizzle over Prisma**: explicit client choice for this project (lighter runtime, SQL-close query builder).
- **Kiosk face matching runs client-side**: avoids sending raw face images to the backend for every recognition attempt; only the match result (member identity) needs to reach the backend to trigger the turnstile call. The signup reference embedding is the opposite case: it is computed on the backend, where the raw photo already lives.
- **Embeddings, not photos, reach the kiosk**: the biometric dataset exposed to the least-trusted client (the kiosk) is reduced to numeric vectors rather than raw images.
- **No session store for chat**: keeps the backend stateless per request; durability lives entirely in the structured fact tables, not in a conversation/session table.
- **No checkout flow**: occupancy is deliberately a rolling-window estimate (FR-37) rather than an exact live count, avoiding the added kiosk complexity of an exit step for no real payoff in an academic demo.
- **Turnstile failures never block check-in recording**: the external API is a best-effort call; the system's own attendance record does not depend on it succeeding (FR-33/FR-34).
- **Single timezone**: all date/time logic ("today's" plan, the occupancy window, gym-open check) uses the server container's local system timezone - no per-user timezone handling (FR-39).
- **Policy-driven authorization over a fixed role enum**: `d_user_policy` (dimension) + `f_user_policy_on_user` (fact) replace a `role` column entirely (§11). Granting a new capability, or promoting/demoting an existing account between member/trainer/admin, is a data change (via the Admin policy-management feature, FR-43) rather than a schema migration or a new signup path - `d_users` stays a single table for every person, since access differs by *policy*, not by *profile shape*.

## 11. Authorization (CASL)

Permissions are entirely data-driven - there is no `role` column anywhere. What a user (member, trainer, or admin - all the same `d_users` row shape, see [05-data-model.md](./05-data-model.md)) can do is the union of every non-expired policy currently granted to them (`f_user_policy_on_user` → `d_user_policy`), turned into a [CASL](https://casl.js.org/) `Ability`.

**Core (shared, `packages/shared/src/auth/`)**:
- `types.ts` - the closed set of CASL actions (`create`/`read`/`update`/`delete`/`manage`) and subjects (`TrainingPlan`, `MedicalCertificate`, `Catalog`, `UserPolicyAssignment`, `MemberApp`, `StaffApp`, etc.) both apps build abilities against.
- `abilities.ts` - `defineAbilityFor(user, grants)`, building a CASL `Ability` from a user's resolved policy grants, plus `buildAbilityRules` (the serializable rules `auth.me` returns) and `createAppAbility(rules)` (rebuilds the ability from them) (see [05-data-model.md](./05-data-model.md)'s `f_user_policy_on_user` note for the grant→rule translation).
- `constants/policies.ts` - well-known `d_user_policy.id` string constants (e.g. the ones that mark a user as "a member" for gating purposes, below), so no module hardcodes a raw policy-id string.
- Split further by domain (`src/auth/aptitude/`, `src/auth/onboarding/`, `src/auth/catalog/`, …), mirroring the backend's domain modules (`rules/backend.md`), rather than one flat abilities file.

**Backend (`apps/api`)**: `src/trpc/context.ts` builds the `Ability` once per request (right after JWT verification) from the requesting user's active grants. Routers check `ctx.ability.can(operation, resource)` before calling into the service - this is the only authorization gate; there is no role-based procedure builder.

**Frontend (`apps/web`)**: `src/abilities.tsx` wraps `@casl/react` 7: it re-exports `AbilityProvider` and exposes a `Can` and a `useAppAbility()` typed to the shared `AppAbility`. `components/auth-guard.tsx` rebuilds the ability once per session from the rules `auth.me` returns (`createAppAbility(rules)`) and provides it via `<AbilityProvider>`. Components either render `<Can I="manage" a="TrainingPlan" />` or call `const ability = useAppAbility(); ability.can('manage', 'TrainingPlan')`.

**The member gate, without a role field**: the aptitude/onboarding pipeline (FR-1–FR-14) and the `(member)` route group apply only to a user whose ability includes the member-designated permission(s) (e.g. `read_member_app`, granted the moment FR-9's clearance completes). A seeded trainer/admin account is granted staff-designated permissions (e.g. `read_staff_app`) instead, and is exempt from the member gate entirely - by construction, not by a special case checking who they are (FR-44).
