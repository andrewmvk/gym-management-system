# Backend (`apps/api`)

Node.js + Express hosting the tRPC HTTP adapter. Express itself stays a thin host - CORS (credentials-enabled, restricted to the frontend origin), cookie parsing, the tRPC adapter mount, and the authenticated file-serving route. All business logic lives behind tRPC procedures.

## Module structure

Organize by domain, not by technical layer: `src/modules/<domain>/` for each of `onboarding`, `plans`, `catalog`, `chat`, `checkins` (the kiosk check-in route, plus a tRPC router for the staff check-in log, `listRecent` and `turnstileSummary`: FR-61), `turnstile`, `ai`, `auth` (registration, login and the registration-completed e-mail hook; FR-9), `profile` (FR-58: `listMine` and `setResolved` on a member's remembered facts in `f_profile_events`), `members` (FR-40/60: the staff member list, the member page and switching a membership between active and inactive), `policies` (FR-42/43/47/48: viewing, granting and revoking `d_user_policy`/`f_user_policy_on_user` and assigning policy groups through `f_user_policy_group_on_user`), `metrics` (FR-36: a member's personal metrics, computed by queries on each call and never stored), `gym` (FR-37/38/39/62: the public gym info page, with open or closed from `d_gym_settings`, a rolling-window occupancy estimate counting distinct members and, behind the read-check-ins permission, today's check-ins per hour, plus the opening-hours editor, all derived on each call; it returns no demand, which belongs to staff and lives in `reviews.overview`; the clock is a parameter of the service so tests can inject it), `focus` (FR-51: a member's saved per-muscle bias in `f_member_muscle_focus` and the `muscle_focus_changed` profile event written on every real change; it uses the existing read and update permissions on the member's own `TrainingPlan`, so it adds no policy). Each domain module has:

- `router.ts` - tRPC procedures + zod input schemas. Thin: no direct DB queries here.
- `service.ts` - business logic, orchestrates repository calls and the AI module.
- `repository.ts` - Drizzle queries only. No business logic here.

## Authorization (CASL)

JWT is verified once in tRPC context middleware, attaching `{ userId }` to `ctx` - no `role`. The same middleware then builds a CASL `Ability` for that user (`apps/api/src/trpc/context.ts`), loading their active `f_user_policy_on_user` grants plus the policies of their active `f_user_policy_group_on_user` memberships and translating each into a CASL rule (`docs/05-data-model.md`), and attaches it as `ctx.ability`. Routers check `ctx.ability.can(operation, resource)` before calling into the service - this is the only authorization gate; don't reintroduce a role-based procedure builder or scatter inline `if (ctx.user.role !== 'admin')` checks.

The shared `Action`/`Subject` types, the `defineAbilityFor(user)` builder, and well-known policy-id constants live in `packages/shared/src/auth/` (`types.ts`, `abilities.ts`, `constants/policies.ts`), split further by domain (`packages/shared/src/auth/onboarding/`, `.../catalog/`, …) mirroring the module list above - both apps build a user's ability from the exact same vocabulary.

Whether a user is subject to the onboarding gate, and which route group they land in, is derived from whether their ability includes the member-designated permission (e.g. `read_member_app`) - never a role field (`docs/04-architecture.md` §11). Seeded trainer/admin accounts belong to a staff group (`trainer`/`admin`) instead and are exempt from that gate entirely. An `inactive` membership (FR-40) is checked beside it: login is refused after a correct password, an existing session stops working, and the kiosk route answers 403 with `reason: 'membership_inactive'` before any turnstile call.

The kiosk endpoint is a **separate** trust boundary gated by a static `KIOSK_API_KEY` header check, unrelated to user auth/ability entirely; don't reuse the ability-building middleware for it (per `docs/04-architecture.md` §5).

## AI integration

A single `src/modules/ai/` wraps the OpenRouter client. Every call site - plan generation and chat, the only two AI purposes - goes through it; no domain service calls OpenRouter directly. The AI module carries text only (no images or files), so an exam's typed findings reach the AI and an attached file never does. Rules:

- Model id comes from `OPENROUTER_MODEL`; never hardcode a model string in business logic.
- Every call assembles context fresh from the DB on each request (profile, onboarding data, `f_profile_events`, relevant catalog) - there is no server-side conversation/session object (FR-25/26).
- Request structured (JSON-mode/function-calling) output. On a parse failure, retry once, then fail safe per `rules/error-handling.md` (an unavailable-error, with no plan saved, for plan/chat) - never guess-parse malformed output into a real decision.

## File uploads

Written to the mounted volume at `UPLOADS_DIR`, namespaced by member id. Only two kinds exist: the reference photo that registration sends (kept server-side only) and the optional attachment of an onboarding exam entry. Validate MIME type and size before writing. Serve reads back only through an authenticated backend route - never mount the volume as a static directory.

## Registration

Registration is one request (FR-9): the consent record, the account with its password hash, the `member` group and an `active` membership are written together in one transaction, and a rejected reference photo rolls it all back (RN-12). On success a registration-completed hook sends the e-mail, whose link goes to the login page, not to onboarding. Accepting a person as a member happens at the physical gym, before the person reaches the page (FR-57); the "only from the gym's own devices" restriction exists on paper only and is not enforced in code (no allowlist, intranet or staff-issued token), so don't add one.

## Env and secrets

Required env vars are read once at startup and the process fails fast if one is missing - don't let a missing secret surface as a runtime error deep in a request handler. `AI_MODE` (`live` or `mock`) switches the AI module for its two purposes, `plan` and `chat`, and `PLAN_GENERATOR=placeholder` (the default in mock mode) is the only case where the deterministic placeholder plan is used: a live AI failure never falls back to it. `TURNSTILE_API_*` is the one exception: it's DB-backed (`d_turnstile_config` table) and admin-editable at runtime, not an env var (`docs/04-architecture.md` §9). Never log a secret value (see `rules/error-handling.md`).

## Exercise/equipment availability

The FR-17 rule (`no equipment` OR `≥1 linked equipment item available`) is one shared predicate in `catalog`'s service, imported everywhere it's needed (plan generation, plan-resolvability checks, equipment-demand aggregation) - don't reimplement it inline at each call site.
