Blocked by: P-06, P-13, P-14, P-20
Covers: FR-37, FR-38, FR-39
MVP: 4
Artifacts: apps/api/src/db/schema/gym-settings.ts, migration, apps/api/src/modules/gym/{router,service,repository}.ts (new domain module), apps/web/src/app/gym/
Evidence: Vitest with an injected clock: occupancy window boundaries, open or closed around the closing minute and on a closed day, and equipment demand that ignores exercises whose equipment is unavailable; manual: the public page and the admin detail render

Task: implement the gym information page: open or closed, estimated occupancy, and what is in demand today.

Context:
- FR-37 to FR-39 in docs/02-requirements.md, the gym info flow in docs/03-features-and-flows.md (flow 8), and d_gym_settings and the derived queries in docs/05-data-model.md.
- There is no checkout event, so occupancy is a rolling-window estimate and must be labeled as an estimate. The window is a named constant of 90 minutes.
- All time logic uses the server's local timezone through lib/dates.ts (P-14). An exercise counts toward equipment demand only if it passes the availability predicate (P-06).
- The gym module is new: add "gym" to the domain list in rules/backend.md and tell the developer, per AGENTS.md "Keeping docs in sync".

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.

Functional requirements:
1. d_gym_settings as a singleton (getOrCreate) with opening_hours as jsonb validated by a zod schema (per weekday open and close times, or closed), defaulting to Monday to Friday 06:00 to 22:00, Saturday 08:00 to 14:00, Sunday closed.
2. Public procedure gym.info returning { isOpen, todayHours, occupancyEstimate, isEstimate: true, demand: { muscleGroups, equipment } }. Occupancy counts check-ins in the last 90 minutes. Demand aggregates today's published plans of members who checked in today, counting only available exercises.
3. A second procedure gym.adminDetail guarded by read_checkins that adds check-ins per hour for today.
4. Public page /gym, linked from the member and staff areas: an open or closed badge with hours, the occupancy number with an explicit "estimate" label, demand lists as simple bars, and the hourly detail for admins. Responsive.

Acceptance criteria:
- The occupancy count changes exactly at the window boundary; the open state is right at the edges and on a closed day.
- Demand never counts an exercise whose only equipment is unavailable.

Tests:
- Vitest against the test database with an injected clock. Pages are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
