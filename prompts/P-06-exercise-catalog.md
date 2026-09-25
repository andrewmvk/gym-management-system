Blocked by: P-03
Covers: FR-16, FR-17, FR-24
MVP: 1
Artifacts: apps/api/src/db/schema/catalog.ts, migration, apps/api/src/modules/catalog/{router,service,repository}.ts, apps/api/src/db/seed-data/catalog.ts, apps/web/src/app/(staff)/catalog/**
Evidence: Vitest: the availability rule (RN-04) passes its five cases, the seed is idempotent, a non-admin gets FORBIDDEN; manual: a seeded admin adds an exercise and toggles equipment

Task: implement the exercise and equipment catalog end to end: schema, procedures, admin screen, and seed data.

Context:
- Schema: docs/05-data-model.md (d_exercises, d_gym_equipment, d_exercise_equipment). Backend structure: rules/backend.md (router, service, repository per domain). Authorization only through ctx.ability (rules/backend.md, docs/04-architecture.md §11). Frontend: rules/frontend.md.
- Rules RN-04 and RN-05 (docs/06-business-rules.md): an exercise is includable only if it needs no equipment or at least one linked equipment item is available; exercises are add-only.
- The availability rule must be one pure predicate in catalog/service.ts, reused by every later feature.

Permitted scope:
- Only the files in Artifacts, the schema/index.ts export line, the app router registration, and the seed hook.
- Don't touch other modules. No new dependencies.

Functional requirements:
1. Tables exactly as in docs/05-data-model.md, with a composite primary key on d_exercise_equipment and is_available defaulting to true. No deletion mechanism.
2. isExerciseAvailable(linkedEquipment) is pure: no equipment means true; otherwise true only if at least one item is available.
3. Procedures: catalog.list (exercises with equipment and computed availability), catalog.listEquipment, catalog.createExercise, catalog.createEquipment, catalog.toggleEquipmentAvailability. Writes require the manage_catalog ability. There is no delete procedure for exercises or equipment.
4. Staff screen at (staff)/catalog: exercise list with an available badge, equipment list with a toggle, and forms to add an exercise (name, muscle group, instructions, linked equipment) and equipment (name). Optimistic toggle reconciled by React Query, empty-name validation, skeleton loading (a per-page skeleton inside GuardedContent, built from components' .Skeleton; rules/frontend.md "Loading states"), explicit error and empty states, usable on a phone.
5. seedCatalog(tx) called from seedBase, inside its transaction (P-02): at least 25 exercises across legs, chest, back, shoulders, arms, core and cardio, and 12 pieces of equipment. About a third of the exercises need no equipment, some have several linked items, and two equipment items start unavailable so the rule shows both outcomes. Idempotent upsert by name.

Acceptance criteria:
- The predicate returns the right value for: no equipment, one available, one unavailable, several with one available, several all unavailable.
- Toggling one equipment item affects only that item; write procedures without the ability return FORBIDDEN.
- Running the seed twice creates no duplicates.

Tests:
- Vitest for the predicate, the procedures, and the seed against the test database. Screens are validated manually with pnpm dev.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
