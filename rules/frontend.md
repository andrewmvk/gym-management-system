# Frontend (`apps/web`)

Next.js App Router, TypeScript, Tailwind CSS + shadcn/ui.

## Data fetching

Use the tRPC client's built-in `@tanstack/react-query` integration for **all** server data - plans, catalog, profile, metrics. Never hand-roll a `fetch`/`axios` call or a manual `useEffect` data-fetch for anything the backend already exposes as a tRPC procedure. Every data-fetching component handles the query's `isPending`/`isError` states explicitly (see `rules/error-handling.md`) - no happy-path-only rendering.

A procedure that yields events (the coach reply, a plan being built, the Health profile save) is consumed with `useStreamAction` (`hooks/use-stream-action.ts`) over the raw client from `useTRPCClient()`, not `useMutation`: each event goes to `onEvent` the moment it arrives, and a stream that breaks ends in the error state, never in a half-finished success. The web client uses the tRPC streaming link (`lib/trpc.ts`) so ordinary queries and mutations keep working unchanged. Show what has arrived (the reply text, each block, each exercise of a plan) instead of waiting for the end.

## Loading states

While data loads, render the shadcn/ui `Skeleton` in place of the content it stands for, sized to match it: same width, height, and layout as the text, avatar, card, or list it replaces. When the data arrives, the real content takes the skeleton's exact place, so the page doesn't jump between states.

- Never use a spinner, a "Loading..." text, or a blank area for loading data. A pending query's `isPending` branch returns the skeleton version of the component.
- Match the shape, not just the presence: a list skeleton repeats the row skeleton the expected number of times (a small fixed count), a line of text becomes a bar of that line's height, and a multi-line paragraph becomes several bars with the last one shorter.
- Skeleton only what is actually loading. Static content (titles, labels, descriptions, navigation, buttons that don't depend on the data) renders right away, and only the data-driven parts next to it become skeletons.
- Never cover a page or section with one big skeleton block. Even when all of a page's content is loading at once (for example, while the session is still being checked), every element gets its own skeleton: the title, each line of text, each card, each list row, each button, each at its own size and position.
- Every reusable component with a fixed layout exposes its own skeleton as a static property in the same file: `Avatar.Skeleton`, `PageHeading.Skeleton`, `PlanCard.Skeleton`. It takes the same layout-affecting props as the component (size, variant, line count), so it always matches. Pages and other components compose these instead of redrawing bars, and a component's own `isPending` branch renders its own `.Skeleton`.
- Every page has its own skeleton, co-located in its page file and built from its components' `.Skeleton`s in the page's real layout (same container, same order, same spacing). It is what the page shows until the session check (`GuardedContent`) and its own data allow the real content.
- A server component can't read `.Skeleton` off a client component (Next.js can't dot into a client module from the server), so a page that composes skeletons of client components is itself a client component (`'use client'`).
- Shared layout chrome, such as the app header, is never replaced by a loading skeleton: it is the same across pages, so it stays in place while the page below it loads. Only a data-driven piece inside it (the signed-in user's name, for example) becomes a skeleton.
- Wrap every pending branch's skeleton in `<Deferred>` (`components/deferred.tsx`): `if (query.isPending) return <Deferred><PlanCard.Skeleton /></Deferred>`. It renders nothing until the load has lasted 200ms, so a fast load goes straight to content instead of blinking skeleton-then-content. `GuardedContent` already defers page skeletons, and a `Deferred` inside an already revealed one renders immediately, so nesting never stacks the delay. Don't hand-roll other timers or "show after N ms" logic for loading UI.
- `Deferred` is for content that is mounting with nothing on screen yet. When a parameter change (a date, a filter, a page) triggers a new load while a result is already shown, don't tear that result down: pass the parameter through `useLaggedValue(param, isLoadingNewParam)` (`hooks/use-lagged-value.ts`) and render from the lagged value. The current view stays until the new data lands, or turns into the skeleton (rendered directly, without `Deferred`) once the load passes 200ms. Controls that set the parameter (chips, pickers) still read the real value so they respond instantly.
- This covers loading data only. A button whose action is running shows its own pending state, not a skeleton: it is disabled, its label changes to what is happening and its mark moves. Use `AiButton` (`components/ai-button.tsx`) for it, with the Coach Mark (`components/ai-mark.tsx`): the default `ai` mark for what the coach does, `mark="tempo"` (no spark) for other work such as saving or applying. Never a spinner, and never a text-only change.

## Forms

`react-hook-form` + `zodResolver`, using shadcn/ui's `Field` components (`Field`, `FieldLabel`, `FieldError`, `FieldGroup`) with react-hook-form's `Controller`; shadcn/ui no longer ships a `Form` component. Wherever a form's shape mirrors a tRPC procedure's input, import that zod schema from `packages/shared` rather than redefining it - client and server validation must never drift apart.

## Client state

There is no global client store (Zustand, Redux, Context-for-server-data, etc.) by default. Before adding one, confirm the state genuinely isn't server state and doesn't fit in local component state or the URL (search params, see "Filters and tabs" above) - most of this app's state is "a plan," "a profile," "a catalog," which React Query already owns.

## Filters and tabs (URL state)

Filters, search terms, and tabs live in the URL's search params through `useUrlState` (`hooks/use-url-state.ts`), never in plain `useState`, so a page refresh (or a shared link) restores the same filters and the same open tab.

- `const [status, setStatus] = useUrlState<StatusFilter>('status', 'all', oneOf(STATUS_FILTERS))`: key, default value, and a validator. A missing or unrecognized param falls back to the default, so a hand-edited URL can never put the page in an invalid state. `oneOf` builds the validator from the same `as const` array the type is derived from.
- The default value is kept out of the URL (`/catalog`, not `/catalog?tab=exercises`). Updates use `replaceState`, so changing a filter doesn't add back-button stops.
- Tabs are controlled: `<Tabs value={tab} onValueChange={...}>` with `useUrlState('tab', ...)`. The page's skeleton keeps an uncontrolled `defaultValue` because it can't read the URL (it is the Suspense fallback).
- Reset dependent state when a filter changes (`pagination.setPage(1)`), as before.
- Key names: `tab`, `q` for a search term, otherwise the filter's own name (`status`, `filter`, `date`).
- Not URL state: transient UI (an open dialog, a draft in a form, a selected row) and wizard steps. Only what a user would expect to survive a reload or to send to a colleague.
- Pages using it must render inside `GuardedContent`, which supplies the `Suspense` boundary `useSearchParams` requires.

## Styling

- Any UI work (a new page, component, state, or a visual change to an existing one) goes through the `/impeccable` skill: invoke it before writing the UI, so the change is checked against the project's design system and quality floor instead of improvised.
- [`DESIGN.md`](../DESIGN.md) at the repo root is the design system (the "Club Kit"): color roles, type roles, layout, elevation, shapes, components, and do's and don'ts. Its tokens mirror `apps/web/src/app/globals.css`, where they actually live. Follow it, and if a change alters the system itself (a new token, a new component pattern, a changed rule), update `DESIGN.md` in the same change.
- shadcn/ui is the first place to look when building any component, not only interactive ones. Before writing markup or reaching for another library, check whether shadcn ships it (a primitive such as `Tabs`, `Popover`, `Tooltip`, `Sheet`, `Table`, or a block such as `Chart`) and start from that, restyled to `DESIGN.md`. Add it with the shadcn CLI (`pnpm dlx shadcn@latest add <component>`, run from `apps/web`) so it lands in `components/ui/`, and consult its docs for the composition pattern. Build a component by hand only when shadcn has nothing that fits, and say so in the PR. The same goes for data: charts are shadcn's `Chart` (Recharts underneath), never hand-drawn SVG bars or rings. The muscle body is the one shape shadcn can't draw, and the radar beside it is a `Chart`.
- Tailwind utility classes directly in JSX; shadcn/ui primitives as the base for every interactive element (buttons, dialogs, forms, toasts) rather than hand-rolled equivalents.
- `cn()` helper for conditional class merging.
- `class-variance-authority` (`cva`) for component variants - don't build variant logic with template-string concatenation.
- Use Tailwind's defined scale, never arbitrary values: `text-xs` not `text-[10px]`, `tracking-wider` not `tracking-[0.04em]`, `rounded-sm` not `rounded-[5px]`, `border-2` not `border-[1.5px]`, `lg:grid-cols-3` + `lg:col-span-2` not `lg:grid-cols-[minmax(0,1fr)_20rem]`. One-off sizes compose into components that don't match the rest of the app. If the scale truly lacks a value the design system needs everywhere (a shadow, a hover color, an inset baseline), add it once as a token in `apps/web/src/app/globals.css` (`@theme`) and use the named utility (`shadow-popover`, `bg-primary-hover`). An arbitrary value is acceptable only when no token can express it, such as viewport math (`max-h-[calc(100dvh-8rem)]`) or a browser-only property (`[scrollbar-width:none]`).
- A page that lists data with search or filters uses `FilterBar` (`components/filter-bar.tsx`): the controls sit in one free row above the list, with `FilterBar.Trailing` holding the segmented filters on the right, then the list in its own bordered card and the `Pagination` below it. Never put a toolbar inside the list's card. Select menus use the shadcn `Select`, and a time of day uses `TimePicker` (`components/time-picker.tsx`), never a native `<input type="time">`.
- Muscle visuals (heat maps, selectors, coverage) use the shared components in `components/muscle-map/` and the `--heat-*` tokens, never a hand-built body or a new ramp. The muscle list and weights come from `packages/shared/src/schemas/muscles.ts`.
- Coach controls stay out of rows, lists and the muscle map: there are no per-row or per-muscle coach buttons, and nothing the member points at is ever sent on its own. Everything the coach can be asked about goes through one reference system (`app/(member)/coach/coach-context.tsx`): the `@` menu in the composer (`mention-menu.tsx`, options in `mention-options.ts`) and pointing mode (`useCoach().startPointing`, `pointing-bar.tsx`), which lights up every pointable thing on the screen. A screen that shows pointable things calls `useCoach().registerTargets()` while it does and draws them with a dashed Kit Cobalt frame plus a full-cover button while `isPointing`; a tap toggles a `MentionChip` (`toggleMention`) with exact ids. A new thing the coach can be asked about is a new `MentionChip` type, an option, a pointing target on its screen and a branch in the server's mention handling (`MentionSchema`, `chat/context.ts`). Whatever the coach returns is a typed block drawn by the app (`app/(member)/coach/coach-block.tsx` is the registry); never render model text as markup. The proposal draft lives in the browser (`use-coach-draft.tsx`) and only Apply writes.
- Interactive elements get a pointer cursor from the base layer in `globals.css` (buttons, links, menu items, options, tabs, labels). Don't add `cursor-pointer` per element, and don't remove that base rule.

## Routing / access structure

Route groups mirror which permissions a user holds, not a role field: `(member)/`, `(staff)/`, `kiosk/`. Each group's `layout.tsx`/`AuthGuard` checks the user's CASL ability for that area's designated permission (e.g. `read_member_app` / `read_staff_app`) - there is no role column to branch on (`docs/05-data-model.md`). Outside the groups, `/` (landing), `/login`, `/signup` (registration, done at the gym; the restriction is on paper only) and `/gym` (the public Gym info page) need no permission. A member who has not completed onboarding is redirected to it from every member route.

## Page titles

Every route has its own title, set through a per-route `layout.tsx` that exports `metadata` (`export const metadata: Metadata = { title: 'Plan' }`). The pages are client components and can't export metadata themselves, so the layout is the server component that does. The root layout's title template renders it as "Plan · Cadence".

## Copy and help text

- Staff-facing demand is called "Today's demand" and lives on the staff Overview, counted in plans; the word "pool" is retired, and the public Gym info page shows no demand. Every count in the UI says what it counts.
- "Out of service" is the one user-facing phrase for unavailable equipment (the internal name stays `is_available` / the `unavailable` badge variant).
- To explain a label without a second visible line, use `HelpTip` (`components/help-tip.tsx`, a `?` button with a tooltip). Its text is also the accessible name, and nothing a reader must act on goes in it, because a tap on a phone may not open the bubble.

## Authorization (CASL)

`src/abilities.tsx` wraps `@casl/react` 7, which has no `createContextualCan` or ability context of its own to create: it re-exports `AbilityProvider` and exposes a `Can` and a `useAppAbility()` typed to the shared `AppAbility`. `components/auth-guard.tsx` rebuilds the ability once per session from the rules `auth.me` returns (`createAppAbility(rules)`) and provides it via `<AbilityProvider>` around the route group. Components either render `<Can I="manage" a="TrainingPlan" />` or call `const ability = useAppAbility(); ability.can('manage', 'TrainingPlan')` - don't hide/show something based on a role check instead of an ability check.

## Kiosk route

Treat `kiosk/` as a distinct, less-trusted surface (per `docs/04-architecture.md` §5). It only ever calls the kiosk-authenticated embeddings-dataset endpoint and the match-submission endpoint - never a route that could return a raw reference photo, and never the member/staff auth flow.

## Component naming

See `rules/naming-conventions.md`.
