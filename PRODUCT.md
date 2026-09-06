# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (TypeScript) frontend with Tailwind CSS + shadcn/ui; Node.js + Express backend exposing tRPC (typed API shared with the frontend); Drizzle ORM over PostgreSQL; custom JWT auth via httpOnly cookie; OpenRouter API (configurable free-tier model) for all AI calls; a real transactional email provider (e.g. Resend) for onboarding invites; in-browser face-detection/embedding library (e.g. face-api.js) for both signup capture and kiosk check-in; local disk file storage via a Docker volume. Three Docker Compose containers: frontend, backend, db. The kiosk check-in panel is the same Next.js app running in a dedicated route, not a separate container. This stack was pre-decided in `docs/04-architecture.md` before this record was written, not chosen during this interview.

## Users

Single gym, three roles:

- **Member**: signs up, gets cleared to train, receives a personalized AI-generated daily plan, checks in via face recognition, talks to an AI about training/state, views history and metrics.
- **Personal Trainer** (gym staff): oversees AI-generated plans across all members as a shared pool (no 1:1 assignment); can comment on or directly override any plan at any time.
- **Gym Admin** (gym staff/management): configures the external turnstile REST API integration, manages the exercise/equipment catalog, monitors gym occupancy, acts as backstop reviewer for every medical-certificate/aptitude result, views mocked membership status.

## Product Purpose

Replaces two disconnected manual processes at a physical gym: a fingerprint scanner with no identity intelligence, and a human trainer who verbally interviews each member on the spot and can't scale or remember history between sessions. The product unifies both into an AI-driven system: face recognition for frictionless access, and a continuously-learning AI that builds a training plan from a rich onboarding profile and ongoing conversation, refining it over time. Success means personalization that's available 24/7 and informed by accumulated state (injuries, medication, life events), not just a single check-in.

## Positioning

The mechanism a competing product could not casually copy: the AI's plan is built from an accumulating structured fact history (every chat message is mined for durable facts — skipped exercises, new injuries, medication changes, life events — and persisted permanently), not from a single interview or a session-scoped conversation. This is combined with frictionless face-recognition access that integrates with the gym's existing turnstile hardware/API, while keeping a human trainer in the loop asynchronously so the AI never has to wait on staff to publish a plan.

## Operating Context

Single gym, single physical location — no multi-tenancy in the data or auth model. A kiosk-style web app runs at the gym's physical entry panel (the same Next.js app, dedicated route) and is treated as a less-trusted client than the authenticated app. The whole system targets local Docker Compose only; there is no production deployment target. **This is an academic project and will not be deployed to real users**: member data, biometric data (face embeddings/photos), and the turnstile REST API are mocked or seeded for evaluation; no real payments are processed and no real biometric data is collected from real people. All "today"/date logic (plan dates, occupancy window, gym-open hours) uses the server's local system timezone — no per-user timezone handling.

## Capabilities and Constraints

Full functional detail lives in `docs/02-requirements.md` (FR-1 through FR-44) and `docs/03-features-and-flows.md`; durable constraints worth restating here:

- Signup gate: basic info + webcam reference photo (embedding computed server-side, raw photo never leaves the backend) → digital aptitude questionnaire → AI verdict (`cleared` / `not_cleared` / `pending_retry`) → medical certificate escalation if not cleared → every certificate result (all three states) routed to an Admin backstop queue regardless of AI confidence. No account/password/login exists before clearance; Admin override is the only recovery path for a wrongly-rejected member.
- Onboarding (post-auth) feeds the first AI training plan; not one-time — can be extended later via chat.
- Plans publish immediately, never blocked on trainer review (preserves 24/7 value prop); trainer review is asynchronous, shared-pool (not 1:1), and multi-note (later notes never overwrite earlier ones). Regenerating a trainer-edited plan requires member confirmation first.
- Exercises come from a curated, add-only library (never deleted, so historical plans always resolve); an exercise is includable only if it needs no equipment or at least one linked equipment item is currently available.
- Chat is stateless/session-less in the UI (FR-25/26) — no persisted visible chat log — but every message is mined for structured facts persisted permanently to the member's history; this is what "remembers" the member across future plan generations.
- Kiosk performs 1:N face-embedding matching only; it fetches `{memberId, embedding}` pairs from a dedicated, kiosk-authenticated endpoint and never receives raw photos. Ambiguous matches (top two too close to call) are rejected, not guessed.
- Turnstile hardware call is best-effort: check-in is always recorded with a success/failed tag regardless of whether the external API call succeeds.
- No checkout event anywhere — occupancy is a rolling-window estimate, explicitly framed as such, not an exact headcount.
- Trainer/admin accounts exist only via a first-boot seed script with fixed demo credentials — there is no staff self-signup UI anywhere. Permissions themselves are policy-driven (member/trainer/admin are granted policy sets, not a fixed role field), so an Admin can later change what an existing account can do without that being a self-signup path.
- Explicitly out of scope: real payments/billing, building the turnstile API itself, a persisted/scrollable chat log, multi-location support, 1:1 trainer assignment, real biometric data from real people, a real checkout/exit flow, exercise deletion, password reset/account recovery, WCAG/i18n/offline/scale requirements, production infra hardening.

## Brand Commitments

Working product name: **Cadence** — chosen during this session (2026-09-06) from a shortlist proposed to evoke an ongoing training rhythm that adapts over time, matching the "continuously-learning AI, not a one-off interview" positioning. No existing logo or visual identity yet; this is a naming decision only, not a visual-world decision (see `new-work` for that).

## Evidence on Hand

None real, by design. All member records, check-ins, training plans, medical certificates, and the turnstile API are mocked or seeded for an academic demo — future work must not fabricate real testimonials, case studies, benchmarks, pricing, or biometric data from real people. A seed script is the source of demo data (fixed trainer/admin accounts, initial exercise/equipment catalog, fake members/check-ins/plans for realistic occupancy/demand numbers).

## Product Principles

1. **AI acts, humans oversee asynchronously.** Plans generate and publish immediately; trainer review never blocks publication. This asynchrony is what makes 24/7 personalization real, not aspirational.
2. **History over interviews.** Every future plan reasons from accumulated structured facts (injuries, medication, life events, adjustments), not a single onboarding conversation or the raw chat transcript.
3. **Minimize biometric exposure at each trust boundary.** Only the backend ever sees raw reference photos; only embeddings reach the kiosk, the least-trusted client.
4. **Distinguish technical failure from a real determination.** An AI outage or turnstile call failure is always coded as its own state (`pending_retry`, `failed`) — never silently coalesced into a real clinical or access decision.
5. **Scope matches an academic, single-location demo.** No multi-tenancy, no production hardening, no payment processing — simplicity here is deliberate, not a gap to fill later.

## Accessibility & Inclusion

No accessibility (WCAG), offline, internationalization, or scale requirement is established for this project (NFR-4) — explicitly out of scope for this academic, non-deployed demo.
