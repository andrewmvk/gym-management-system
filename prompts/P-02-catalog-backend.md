Task: implement the catalog module's tRPC procedures (list exercises, list equipment, create
exercise, create equipment, toggle equipment availability).

Context:
- The catalog schema already exists (see prompts/P-01-catalog-data-model.md): d_exercises,
  d_gym_equipment, d_exercise_equipment.
- The per-domain backend module structure is in rules/backend.md: router.ts (procedures + zod,
  no direct query), service.ts (logic), repository.ts (Drizzle only).
- Authorization is 100% via CASL (ctx.ability.can(operation, resource)), never a role if-check —
  see rules/backend.md section "Authorization (CASL)" and docs/04-architecture.md §11.
- The availability rule (FR-17 / RN-04) must be a single predicate in catalog/service.ts, reused
  by any procedure that needs to know whether an exercise is available — don't reimplement the
  logic in more than one place (rules/backend.md, section "Exercise/equipment availability").

Permitted scope:
- Only create apps/api/src/modules/catalog/router.ts, service.ts, repository.ts.
- If a new CASL "Catalog" subject is needed, only add it to
  packages/shared/src/auth/types.ts (don't recreate the whole file, just extend it).
- Don't change the frontend, Docker, other modules, or the schema created in P-01.
- Don't add new dependencies.

Functional requirements:
1. catalog.list — returns exercises with their linked equipment and whether each is currently
   available (applying the predicate).
2. catalog.listEquipment — returns all equipment with its current is_available.
3. catalog.createExercise — creates an exercise; requires the catalog-management policy.
4. catalog.createEquipment — creates a piece of equipment; requires the catalog-management policy.
5. catalog.toggleEquipmentAvailability — flips is_available on a piece of equipment; requires the
   catalog-management policy.
6. There is no delete procedure for an exercise (FR-24 / RN-05) or for equipment.

Acceptance criteria:
- An exercise with no linked equipment is always "available".
- An exercise with linked equipment is only "available" if at least one is is_available = true.
- toggleEquipmentAvailability only affects the specified equipment, none other.
- Any create*/toggle* call without the correct policy returns FORBIDDEN via ctx.ability.

Tests:
- Vitest unit test for the availability predicate, covering: no linked equipment; one available
  equipment; one unavailable equipment; multiple with at least one available; multiple all
  unavailable.
- Run only the catalog module's tests.

Final response:
- Respond in at most 10 lines with files changed, tests run, and pending items.
