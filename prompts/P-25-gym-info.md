Blocked by: P-06, P-13, P-14, P-20
Covers: FR-37, FR-38, FR-39
MVP: 4
Artifacts: apps/api/src/db/schema/gym-settings.ts, migration, apps/api/src/modules/gym/{router,service,repository}.ts (+ service and router tests; new domain module), packages/shared/src/schemas/gym.ts, apps/web/src/app/gym/{page,gym-info}.tsx, apps/web/src/components/{panel-section,app-header}.tsx, apps/web/src/components/ui/navigation-menu.tsx (grouped header menu), apps/web/src/lib/navigation.ts
Evidence: Vitest against Postgres with an injected clock: occupancy window boundaries (a check-in exactly 90 minutes old counts, one millisecond older does not), open or closed around the opening and closing minute and on a closed day, the next opening or closing time, equipment demand that ignores exercises whose equipment is unavailable (and unavailable alternatives of an available exercise), the hourly detail, gym.info for a signed-out caller, gym.adminDetail refused for a member and a signed-out caller; manual in the running stack: the public page and the admin detail render

Task: implement the gym information page: open or closed, estimated occupancy, and what is in demand today.

Context:
- FR-37 to FR-39 in docs/02-requirements.md, the gym info flow in docs/03-features-and-flows.md (flow 8), and d_gym_settings and the derived queries in docs/05-data-model.md.
- There is no checkout event, so occupancy is a rolling-window estimate and must be labeled as an estimate. The window is a named constant of 90 minutes.
- All time logic uses the server's local timezone through lib/dates.ts (P-14). An exercise counts toward equipment demand only if it passes the availability predicate (P-06).
- The gym module is new: add "gym" to the domain list in rules/backend.md and tell the developer, per AGENTS.md "Keeping docs in sync".

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.
- The opening-hours zod schema, its defaults and the 90-minute window live in `packages/shared/src/schemas/gym.ts`, because the page needs the same types as the API.

Functional requirements:
1. d_gym_settings as a singleton (getOrCreate) with opening_hours as jsonb validated by a zod schema (per weekday open and close times, or closed), defaulting to Monday to Friday 06:00 to 22:00, Saturday 08:00 to 14:00, Sunday closed.
2. Public procedure gym.info returning { isOpen, todayHours, nextChange, occupancyEstimate, isEstimate: true, occupancyWindowMinutes, demand: { muscleGroups, equipment } }. nextChange is when the gym closes if open, otherwise when it next opens (today, tomorrow or a weekday), or null if it never opens. Occupancy counts check-ins in the last 90 minutes (the window start is inclusive, check-ins after now are ignored). Demand aggregates today's plans of members who checked in today, counting only available exercises and, for equipment, only the available items.
3. A second procedure gym.adminDetail guarded by read_checkins that adds check-ins per local hour for today and the current hour.
4. Public page /gym, linked from the member and staff areas: an open or closed status on a Locker Ink panel with today's hours and the next change, the occupancy as "About N people" with an explicit "estimate" label, demand lists as simple bars (one empty state when both are empty), and the hourly detail for admins (tap a bar for its count, the peak and total as text). A failed refresh shows an "Updated HH:MM" stamp with a "Couldn't refresh" badge. Responsive.
5. The staff header groups its pages into two hover menus (Gym: Gym info, Catalog, Turnstile; People: Members, Certificates, Policies) next to the plain Overview and Plan reviews links, so no page name wraps; the member header stays flat.

Acceptance criteria:
- The occupancy count changes exactly at the window boundary; the open state is right at the edges and on a closed day.
- Demand never counts an exercise whose only equipment is unavailable.

Tests:
- Vitest against the test database with an injected clock. Pages are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
