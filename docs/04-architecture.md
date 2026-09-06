# Technical Architecture

## 1. Stack Overview

| Layer | Choice |
|---|---|
| Frontend framework | Next.js, TypeScript (`.tsx`) |
| Styling / UI | Tailwind CSS + shadcn/ui |
| Backend framework | Node.js + Express (tRPC HTTP adapter) |
| API layer | tRPC (end-to-end typed, shared types between frontend and backend) |
| ORM | Drizzle |
| Database | PostgreSQL |
| Auth | Custom JWT, delivered via httpOnly cookie |
| File storage | Local disk via Docker volume (path/URL stored in Postgres) |
| AI provider | OpenRouter API, using a free-tier model (configurable) |
| Email | Real transactional provider (e.g. Resend) for the onboarding invite link |
| Face recognition | In-browser face detection/embedding library (e.g. face-api.js), running client-side in both the signup flow (capture + embed reference) and the kiosk check-in flow (1:N match against embeddings) |
| Containerization | Docker Compose: separate containers for frontend, backend, and Postgres |

## 2. Container Architecture

```mermaid
flowchart LR
    subgraph Frontend Container
        FE[Next.js app<br/>Tailwind + shadcn/ui]
    end
    subgraph Kiosk Client
        KIOSK[Kiosk web app<br/>face-api.js runs here<br/>holds embeddings only, never photos]
    end
    subgraph Backend Container
        BE[Node.js + Express<br/>tRPC router<br/>Drizzle ORM]
        VOL[(Docker volume<br/>/uploads)]
        BE --- VOL
    end
    subgraph DB Container
        PG[(PostgreSQL)]
    end
    FE -- tRPC over HTTP, JWT cookie --> BE
    KIOSK -- fetch embeddings dataset<br/>KIOSK_API_KEY --> BE
    KIOSK -- report matched customerId --> BE
    BE -- SQL via Drizzle --> PG
    BE -- REST call --> EXT[External Turnstile REST API<br/>(pre-existing, admin-configured)]
    BE -- API call --> AI[OpenRouter API<br/>free model]
    BE -- API call --> MAIL[Email provider<br/>e.g. Resend]
```

Three containers are orchestrated via `docker-compose.yml`: `frontend`, `backend`, `db`. The kiosk is the same Next.js frontend app running in a dedicated route/mode (not a fourth container), but is conceptually a separate, less-trusted client since it's the one physically exposed at the gym panel. The backend container mounts a volume for uploaded files (reference photos, exam attachments, medical certificates).

This is a decoupled architecture (frontend and backend are separate deployables), which is why tRPC is used over plain Next.js API routes — it preserves end-to-end type safety across the network boundary between the two containers, and the frontend/backend still share TypeScript types (e.g. via a shared package or by importing the backend's router type).

## 3. Authentication Flow

1. Customer/trainer/admin logs in via a tRPC mutation on the backend.
2. Backend verifies credentials (bcrypt-hashed password), issues a signed JWT containing `{ userId, role }`.
3. JWT is set as a cookie with `httpOnly` and `sameSite=lax` always on; `Secure` is set conditionally — only when `NODE_ENV=production`. Local Docker Compose demo runs use plain HTTP, and a `Secure` cookie would silently never be sent/set by the browser in that case, so it must not be hardcoded on.
4. Frontend includes credentials on every tRPC request (`fetch` with `credentials: 'include'`); CORS on the backend must allow the frontend's origin with credentials.
5. Backend tRPC context middleware verifies the JWT on every request, attaching `{ userId, role }` to `ctx`; protected procedures check `ctx.user` and role as needed (customer/trainer/admin-scoped procedures).
6. No login/authenticated route exists before aptitude clearance (see FR-9) — the JWT is only issued once an account exists.
7. Trainer/admin accounts are never created via a login-adjacent signup mutation — they only exist via the seed script (see §8).

## 4. AI Integration

- All AI calls (aptitude questionnaire evaluation, medical certificate review, training plan generation/adjustment, and the chat assistant) go through the **backend**, never directly from the frontend — this keeps the OpenRouter API key server-side only.
- The specific free model is configurable via an environment variable (e.g. `OPENROUTER_MODEL`), since OpenRouter's free-model lineup changes over time; the code should not hardcode a specific model id in business logic.
- Each AI call is a **stateless request** built from context assembled server-side each time: the customer's profile, onboarding data, structured history/fact log, and (for plan generation) the curated exercise/equipment catalog. There is no server-side conversation/session object for the chat — this matches FR-25/FR-26.
- Chat responses are expected to return two things: the natural-language reply for the customer, and any structured facts to persist (e.g. via a JSON-mode/function-calling style response) — this structured extraction is what feeds FR-27.
- **Failure handling**: OpenRouter's free tier is rate-limited and can be unreliable. Any transient failure, timeout, or rate-limit response from a questionnaire/certificate evaluation call must be coded as `pending_retry` — a distinct technical state — never silently surfaced as a crash, and never coalesced into `cleared`/`not_cleared` (which would misrepresent a real clinical determination). The same failures on a chat/plan-generation call should surface as a normal "AI is temporarily unavailable, try again" error to the customer rather than a raw exception.

## 5. Face Recognition & Embedding Distribution

- Reference photos captured at signup are processed server-side into a face embedding (a fixed-length numeric vector) using the recognition library's embedding model. The raw photo is stored only on the backend's upload volume for audit/recompute purposes and is **never** sent to the kiosk or any other client.
- The kiosk fetches only the embedding dataset (`{ customerId, embedding }` pairs, no images) from a dedicated backend endpoint gated by a static `KIOSK_API_KEY`, rather than being open to arbitrary callers.
- Matching uses a similarity/distance threshold to decide "is this a match at all," plus a margin check between the best and second-best candidate to reject ambiguous ties — the customer is asked to retry rather than the system guessing (FR-32).
- This reduces exposure relative to shipping raw photos, but the full embedding dataset is still present in the kiosk's browser memory/network traffic; the kiosk is assumed to run on a trusted, non-public local network for this academic project — a real deployment would need a more hardened kiosk boundary (explicitly out of scope here, see [02-requirements.md](./02-requirements.md)).

## 6. File Storage

- Uploads (signup reference photo, exam attachments, medical certificates) are written by the backend to a mounted Docker volume (e.g. `/app/uploads`), namespaced by customer id.
- Only the relative path (or a served URL) is stored in Postgres; the backend serves/proxies file reads through an authenticated route rather than exposing the volume directly.
- The computed face embedding (not the photo) is what's cached in Postgres and is the only biometric artifact ever served outward, to the kiosk endpoint above.

## 7. Email

- Onboarding invite emails are sent via a real transactional email API (e.g. Resend) called from the backend once aptitude clearance completes.
- Requires an API key stored as a backend environment variable; sender domain/config is out of scope of correctness concerns since this is a non-deployed academic project (a sandbox/testing sender is acceptable).
- The onboarding page is also reachable directly inside the app (FR-11), so email deliverability isn't a hard dependency for completing onboarding.

## 8. Seed Data & Bootstrapping

- A database seed script, run at first boot, creates a fixed set of demo trainer and admin accounts with known credentials (documented in the project README) — this is the *only* way trainer/admin accounts come into existence; there is no staff registration UI (FR-41).
- The same seed script populates the initial exercise/equipment catalog and a batch of fake seeded customers, check-ins, and plans so that occupancy/equipment-demand metrics have realistic data to show in a demo (see [02-requirements.md](./02-requirements.md), Permitted Scopes).

## 9. Environment Variables (indicative)

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string (Drizzle) |
| `JWT_SECRET` | backend | Signing secret for auth JWTs |
| `NODE_ENV` | backend | Gates the `Secure` cookie flag (production only) |
| `OPENROUTER_API_KEY` | backend | AI provider auth |
| `OPENROUTER_MODEL` | backend | Selected free model id |
| `RESEND_API_KEY` | backend | Email provider auth |
| `UPLOADS_DIR` | backend | Path inside container to the mounted uploads volume |
| `KIOSK_API_KEY` | backend + kiosk client | Authenticates the kiosk's fetch of the face-embedding dataset |
| `TURNSTILE_API_*` | backend (DB-backed, admin-editable) | Not a static env var — configured at runtime by the Admin role and stored in the `turnstile_config` table, since it must be editable without a redeploy |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL for tRPC client |

## 10. Notable Architectural Decisions & Rationale

- **tRPC over REST/GraphQL**: chosen for type-safety across the frontend/backend boundary despite them being separate containers — avoids hand-written request/response types drifting out of sync.
- **Drizzle over Prisma**: explicit client choice for this project (lighter runtime, SQL-close query builder).
- **Face recognition runs client-side**: avoids sending raw face images to the backend for every recognition attempt; only the match result (customer identity) needs to reach the backend to trigger the turnstile call.
- **Embeddings, not photos, reach the kiosk**: the biometric dataset exposed to the least-trusted client (the kiosk) is reduced to numeric vectors rather than raw images.
- **No session store for chat**: keeps the backend stateless per request; durability lives entirely in the structured fact tables, not in a conversation/session table.
- **No checkout flow**: occupancy is deliberately a rolling-window estimate (FR-37) rather than an exact live count, avoiding the added kiosk complexity of an exit step for no real payoff in an academic demo.
- **Turnstile failures never block check-in recording**: the external API is a best-effort call; the system's own attendance record does not depend on it succeeding (FR-33/FR-34).
- **Single timezone**: all date/time logic ("today's" plan, the occupancy window, gym-open check) uses the server container's local system timezone — no per-user timezone handling (FR-39).
