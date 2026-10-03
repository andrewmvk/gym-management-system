Blocked by: P-06, P-13, P-14, P-24, P-25
Covers: FR-49, FR-50, FR-51, FR-52 (and the rewording of FR-16, FR-20, FR-24, FR-36, FR-38)
MVP: 4
Artifacts: packages/shared/src/schemas/{muscles.ts, muscle-heat.ts (+ test), profile-events.ts}, apps/api/src/db/schema/{catalog.ts (d_exercise_muscles, muscle and muscle_role enums, muscle_group dropped), plans.ts (f_member_muscle_focus, muscle_focus_changed event)}, migration apps/api/drizzle/0010, apps/api/src/db/seed-data/catalog.ts (a muscle map for every exercise, filled in for existing ones), apps/api/src/modules/focus/{router,service,repository}.ts (+ service test; new domain module), apps/api/src/modules/{catalog,plans,metrics,gym,chat}/ (muscles on exercises, muscleLoad on the plan view, metrics and gym demand, prompt lines and the member muscle focus block, placeholder generator honoring focus), apps/web/src/components/muscle-map/ (muscle-paths.ts, muscle-map, muscle-legend, muscle-rank-list, muscle-load-view, muscle-selector, muscle-marks, illustrations/), apps/web/src/app/(member)/plan/{focus-stepper,muscle-detail,plan-muscle-panel,today-plan,plan-history,exercise-row}.tsx, apps/web/src/app/(member)/metrics/member-metrics.tsx, apps/web/src/app/gym/gym-info.tsx, apps/web/src/app/(staff)/catalog/{coverage-section,exercise-section,equipment-section,page}.tsx, apps/web/src/app/globals.css (heat tokens)
Evidence: Vitest: the shared heat functions (weighted load, heat steps, ranking, catalog coverage, equipment impact) and the muscle map schema; the focus service against Postgres (a saved bias, replacing a bias, back to normal removes the row, an unchanged level records no event, members stay separate); the catalog router and seed (an exercise needs a primary muscle, every seeded exercise has one, a missing map is filled in); the plan aggregate, metrics muscle load, gym demand, chat prompt and placeholder generator tests; manual in the running stack: the front and back maps in light and dark, the body selector in the add-exercise form, the Coverage tab with out-of-service equipment selected, the focus stepper and the rebuild confirmation

Task: replace free-text muscle groups with a fixed muscle map, and use it to show where a plan, the metrics, the gym demand and the catalog concentrate, and to let the member steer future plans (FR-49 to FR-52).

Context:
- FR-16, FR-20, FR-24, FR-36 and FR-38 in docs/02-requirements.md are reworded, and FR-49 to FR-52 are new. The data model is d_exercise_muscles and f_member_muscle_focus in docs/05-data-model.md, and the muscle map section of docs/04-architecture.md (§12) describes where each piece lives.
- The muscles are the 22 ids drawn in the front and back illustrations. Left and right are never told apart, and a muscle seen from both sides is one muscle with one weight.
- The focus is a preference only: injuries, conditions and safety override it (AGENTS.md principle 4 still applies to AI failures, which are never shown as an empty map). Trainer review never blocks publication (principle 1), and the focus history is recorded as profile events (principle 2).
- The exercise library stays add-only (FR-24): the muscle map is written at creation and not edited afterward. The availability predicate of P-06 decides which exercises count.
- The focus module is new: add "focus" to the domain list in rules/backend.md and tell the developer, per AGENTS.md "Keeping docs in sync". The visual rules are in DESIGN.md (Muscle Map).

Permitted scope:
- Only the files in Artifacts and the schema/index.ts and router registrations. No new dependencies.
- No new policy: the focus procedures use the existing read and update permissions on the member's own plans.
- Don't change check-in, turnstile, auth or the aptitude flow.

Functional requirements:
1. packages/shared: the muscle registry (ids, labels, views), roles and weights (primary 1, secondary 0.5), the exercise muscle map schema (at least one primary, no muscle twice), the focus schema (an integer from -2 to 2), and pure functions for weighted load, heat steps, ranking, catalog coverage and the impact of out-of-service equipment.
2. Schema and migration: drop d_exercises.muscle_group, add d_exercise_muscles, f_member_muscle_focus and the muscle_focus_changed event type. Seed a muscle map for every seeded exercise, leaving a few muscles untrained on purpose, and fill the map in for an existing exercise that has none.
3. catalog.createExercise takes muscles instead of a muscle group. The plan view carries each exercise's muscles and a muscleLoad of the performable exercises. metrics.mine returns the muscle load of the completed exercises in place of the by-muscle-group breakdown. gym.info returns the weighted muscle load of today's planned sets in place of the muscle group list. The anonymized aggregate returns top muscles.
4. focus.get and focus.set for the signed-in member. Setting a level writes or removes the row and appends a muscle_focus_changed event, and writes nothing when the level is unchanged.
5. AI prompts: every catalog line is `id | name | primary: ... | secondary: ...`, plan generation and chat both get the member's muscle focus, the system prompts state that safety always overrides it, the focus change events are left out of the history lines, and the placeholder generator honors the focus.
6. Web: the shared muscle map components (front and back bodies with a phone toggle, legend, ranked list, selector, skeleton). The plan page shows the map and drilldown beside the plan with the focus stepper and a confirmed "Rebuild today with my focus"; plan history and metrics show the same map read-only; gym info shows muscle demand as a heat map. The catalog gets a body selector in the add-exercise form, a Coverage tab (catalog, available now, lost; out-of-service equipment impact), and the equipment tab states what each out-of-service piece takes out.

Acceptance criteria:
- An exercise cannot be created without a primary muscle, and no free-text muscle name is accepted anywhere.
- A muscle seen from both sides has the same weight on both views.
- Setting the focus a muscle already has records no event; setting it back to normal removes its row.
- The plan view never counts an exercise that is not performable right now.

Tests:
- Vitest against the test database for the API; the shared functions on hand-built data. Pages are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
