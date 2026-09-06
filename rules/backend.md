# Backend (`apps/api`)

Node.js + Express hosting the tRPC HTTP adapter. Express itself stays a thin host — CORS (credentials-enabled, restricted to the frontend origin), cookie parsing, the tRPC adapter mount, and the authenticated file-serving route. All business logic lives behind tRPC procedures.

## Module structure

Organize by domain, not by technical layer: `src/modules/<domain>/` for each of `aptitude`, `onboarding`, `plans`, `catalog`, `chat`, `checkins`, `turnstile`, `ai`, `auth`, `policies` (FR-42/43: viewing/granting/revoking `d_user_policy`/`f_user_policy_on_user`). Each domain module has:

- `router.ts` — tRPC procedures + zod input schemas. Thin: no direct DB queries here.
- `service.ts` — business logic, orchestrates repository calls and the AI module.
- `repository.ts` — Drizzle queries only. No business logic here.

## Authorization (CASL)

JWT is verified once in tRPC context middleware, attaching `{ userId }` to `ctx` — no `role`. The same middleware then builds a CASL `Ability` for that user (`apps/api/src/trpc/context.ts`), loading their active `f_user_policy_on_user` grants and translating each into a CASL rule (`docs/05-data-model.md`), and attaches it as `ctx.ability`. Routers check `ctx.ability.can(operation, resource)` before calling into the service — this is the only authorization gate; don't reintroduce a role-based procedure builder or scatter inline `if (ctx.user.role !== 'admin')` checks.

The shared `Action`/`Subject` types, the `defineAbilityFor(user)` builder, and well-known policy-id constants live in `packages/shared/src/auth/` (`types.ts`, `abilities.tsx`, `constants/policies.ts`), split further by domain (`packages/shared/src/auth/aptitude/`, `.../onboarding/`, `.../catalog/`, …) mirroring the module list above — both apps build a user's ability from the exact same vocabulary.

Whether a user is subject to the aptitude/onboarding gate, and which route group they land in, is derived from whether their ability includes the member-designated permission (e.g. `read_member_app`) — never a role field (`docs/04-architecture.md` §11). Seeded trainer/admin accounts are granted staff-designated permissions instead and are exempt from that gate entirely.

The kiosk endpoint is a **separate** trust boundary gated by a static `KIOSK_API_KEY` header check, unrelated to user auth/ability entirely; don't reuse the ability-building middleware for it (per `docs/04-architecture.md` §5).

## AI integration

A single `src/modules/ai/` wraps the OpenRouter client. Every call site — aptitude evaluation, certificate review, plan generation, chat — goes through it; no domain service calls OpenRouter directly. Rules:

- Model id comes from `OPENROUTER_MODEL`; never hardcode a model string in business logic.
- Every call assembles context fresh from the DB on each request (profile, onboarding data, `f_profile_events`, relevant catalog) — there is no server-side conversation/session object (FR-25/26).
- Request structured (JSON-mode/function-calling) output. On a parse failure, retry once, then fail safe per `rules/error-handling.md` (`pending_retry` for aptitude/certificate, a normal unavailable-error for plan/chat) — never guess-parse malformed output into a real decision.

## File uploads

Written to the mounted volume at `UPLOADS_DIR`, namespaced by member id. Validate MIME type and size before writing. Serve reads back only through an authenticated backend route — never mount the volume as a static directory.

## Env and secrets

Required env vars are read once at startup and the process fails fast if one is missing — don't let a missing secret surface as a runtime error deep in a request handler. `TURNSTILE_API_*` is the one exception: it's DB-backed (`d_turnstile_config` table) and admin-editable at runtime, not an env var (`docs/04-architecture.md` §9). Never log a secret value (see `rules/error-handling.md`).

## Exercise/equipment availability

The FR-17 rule (`no equipment` OR `≥1 linked equipment item available`) is one shared predicate in `catalog`'s service, imported everywhere it's needed (plan generation, plan-resolvability checks, equipment-demand aggregation) — don't reimplement it inline at each call site.
