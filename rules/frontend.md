# Frontend (`apps/web`)

Next.js App Router, TypeScript, Tailwind CSS + shadcn/ui.

## Data fetching

Use the tRPC client's built-in `@tanstack/react-query` integration for **all** server data — plans, catalog, profile, metrics. Never hand-roll a `fetch`/`axios` call or a manual `useEffect` data-fetch for anything the backend already exposes as a tRPC procedure. Every data-fetching component handles the query's `isPending`/`isError` states explicitly (see `rules/error-handling.md`) — no happy-path-only rendering.

## Forms

`react-hook-form` + `zodResolver`, using shadcn/ui's `Form` components. Wherever a form's shape mirrors a tRPC procedure's input, import that zod schema from `packages/shared` rather than redefining it — client and server validation must never drift apart.

## Client state

There is no global client store (Zustand, Redux, Context-for-server-data, etc.) by default. Before adding one, confirm the state genuinely isn't server state and doesn't fit in local component state or the URL (search params) — most of this app's state is "a plan," "a profile," "a catalog," which React Query already owns.

## Styling

- Tailwind utility classes directly in JSX; shadcn/ui primitives as the base for every interactive element (buttons, dialogs, forms, toasts) rather than hand-rolled equivalents.
- `cn()` helper for conditional class merging.
- `class-variance-authority` (`cva`) for component variants — don't build variant logic with template-string concatenation.

## Routing / access structure

Route groups mirror which permissions a user holds, not a role field: `(member)/`, `(staff)/`, `kiosk/`. Each group's `layout.tsx`/`AuthGuard` checks the user's CASL ability for that area's designated permission (e.g. `read_member_app` / `read_staff_app`) — there is no role column to branch on (`docs/05-data-model.md`).

## Authorization (CASL)

`src/abilities.tsx` defines the ability React context (`AbilityContext`) and `can = createContextualCan(AbilityContext.Consumer)`. `AuthGuard.tsx` computes `defineAbilityFor(session.user)` once per session and provides it via `<AbilityContext.Provider>` wrapping the app (or a route group). Components either render `<Can I="manage" a="TrainingPlan" />` or call `const ability = useAbility(AbilityContext); ability.can('manage', 'TrainingPlan')` — don't hide/show something based on a role check instead of an ability check.

## Kiosk route

Treat `kiosk/` as a distinct, less-trusted surface (per `docs/04-architecture.md` §5). It only ever calls the kiosk-authenticated embeddings-dataset endpoint and the match-submission endpoint — never a route that could return a raw reference photo, and never the member/staff auth flow.

## Component naming

See `rules/naming-conventions.md`.
