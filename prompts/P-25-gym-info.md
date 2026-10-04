Blocked by: P-06, P-13, P-14, P-20
Covers: FR-37, FR-38, FR-39, FR-62 (FR-37 and FR-38 as reworded by the 2026-10-04 critique, audit-log item 21: distinct members, and no demand on the public page)
MVP: 4
Artifacts: apps/api/src/db/schema/gym-settings.ts, migration, apps/api/src/modules/gym/{router,service,repository}.ts (+ service and router tests; new domain module), packages/shared/src/schemas/gym.ts, apps/web/src/app/gym/{page,gym-info}.tsx, apps/web/src/app/(staff)/settings/hours/{page,opening-hours-form}.tsx (the opening-hours editor), apps/web/src/components/{panel-section,app-header,public-header}.tsx, apps/web/src/app/page.tsx (the landing link), apps/web/src/components/ui/navigation-menu.tsx (grouped header menu), apps/web/src/components/ui/chart.tsx (shadcn Chart, adds the recharts dependency), apps/web/src/lib/navigation.ts
Evidence: Vitest against Postgres with an injected clock: occupancy window boundaries (a check-in exactly 90 minutes old counts, one millisecond older does not, a member who scans several times counts once), open or closed around the opening and closing minute and on a closed day, the next opening or closing time, the hourly detail counting distinct members per hour, gym.info and gym.adminDetail carrying no demand, gym.info for a signed-out caller, gym.adminDetail refused for a member and a signed-out caller; gym.getHours and gym.updateHours: an admin reads and replaces the hours (null meaning closed), a day that closes at or before it opens is rejected and nothing changes, and a member, a trainer and a signed-out visitor are refused; manual in the running stack: the public page, the admin hourly detail and the opening-hours editor render (not yet checked in a browser since demand moved to the Overview)

Task: implement the gym information page (open or closed, estimated occupancy, hourly check-ins for staff) and the admin opening-hours editor.

Context:
- FR-37 to FR-39 and FR-62 in docs/02-requirements.md, the gym info flow in docs/03-features-and-flows.md (flow 8), and d_gym_settings and the derived queries in docs/05-data-model.md.
- There is no checkout event, so occupancy is a rolling-window estimate of distinct members and must be labeled as an estimate. The window is a named constant of 90 minutes.
- The public page deliberately shows no demand. What today's plans ask of the muscles and the equipment is for the AI (FR-29) and for staff, so it lives on the staff Overview as the "Today's demand" card (FR-56, P-30, P-29), never on a screen a visitor can open.
- All time logic uses the server's local timezone through lib/dates.ts (P-14, FR-39).
- The gym module is new: add "gym" to the domain list in rules/backend.md and tell the developer, per AGENTS.md "Keeping docs in sync".

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.
- The opening-hours zod schema, its defaults and the 90-minute window live in `packages/shared/src/schemas/gym.ts`, because the page and the editor need the same types as the API.

Functional requirements:
1. d_gym_settings as a singleton (getOrCreate) with opening_hours as jsonb validated by a zod schema (per weekday open and close times, or null for closed, close after open), defaulting to Monday to Friday 06:00 to 22:00, Saturday 08:00 to 14:00, Sunday closed.
2. Public procedure gym.info returning { isOpen, todayHours, nextChange, occupancyEstimate, isEstimate: true, occupancyWindowMinutes } and no demand. nextChange is when the gym closes if open, otherwise when it next opens (today, tomorrow or a weekday), or null if it never opens. Occupancy counts the distinct members with a check-in in the last 90 minutes (the window start is inclusive, check-ins after now are ignored, whatever the turnstile status).
3. A second procedure gym.adminDetail guarded by read_checkins that adds the distinct members who checked in per local hour for today and the current hour.
4. gym.getHours and gym.updateHours(openingHours), guarded by manage_gym_settings (manage GymSettings, admin group): the editor reads and replaces the whole week; the schema rejects a day whose close is not after its open.
5. Public page /gym (no sign-in needed), whose header follows the visitor: the staff or member area they came from, or the public header with its own Gym info link (the landing page links to it too). An open or closed status on a Locker Ink panel with today's hours and the next change, the occupancy as "About N people" with an explicit "estimate" label and the window stated, and, for anyone with read_checkins, the hourly detail as a shadcn Chart bar chart (hover or tap a bar for its count in the tooltip, the busiest hour as text, each member counted once per hour, the current hour in cobalt). A signed-in staff member also gets a line linking to the Overview's Today's demand card and, with read_checkins, to the check-in log. A failed refresh shows an "Updated HH:MM" stamp with a "Couldn't refresh" badge. The page refreshes every 60 seconds. Responsive.
6. Staff page (staff)/settings/hours ("Opening hours", in the Setup nav group, shown with manage_gym_settings): the week from Monday to Sunday, each day a Closed switch and open and close time inputs, with the schema's message shown under a day whose close is not after its open, a Save button enabled only when something changed, skeleton, error and no-access states, and the gym info query refreshed after a save. The hours drive the open or closed state and the next change on the gym page (FR-38) and on the member's Now screen (FR-55).
7. The staff header groups its pages into dropdowns next to the plain Overview and Plan reviews links, so no page name wraps (Gym: Gym info, Check-ins, Catalog; People: Members, Policies; Setup: Turnstile, Opening hours, see P-23); the member header stays flat.

Acceptance criteria:
- The occupancy count changes exactly at the window boundary, counts a member once however often they scan, and the open state is right at the edges and on a closed day.
- Neither gym.info nor gym.adminDetail returns any muscle or equipment demand, and the public page shows none.
- Only an admin can read or change the opening hours, and a change shows on the public page.

Tests:
- Vitest against the test database with an injected clock. Pages are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
