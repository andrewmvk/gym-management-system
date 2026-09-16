Task: implement the catalog screen (staff area) to list exercises/equipment and let the Admin
register new items and toggle equipment availability.

Context:
- The tRPC procedures catalog.list, catalog.listEquipment, catalog.createExercise,
  catalog.createEquipment, and catalog.toggleEquipmentAvailability already exist (see
  prompts/P-02-catalog-backend.md).
- Frontend conventions are in rules/frontend.md: all server reads/writes go through tRPC + React
  Query (never manual fetch); forms use react-hook-form + zodResolver, reusing the zod schema
  from packages/shared when the input mirrors a procedure; shadcn/ui as the base for any
  interactive component.
- Routes are grouped by permission, not by role: this screen belongs to the (staff)/ group
  (rules/frontend.md, section "Routing / access structure").

Permitted scope:
- Only create apps/web/src/app/(staff)/catalog/** (page.tsx and components specific to this
  screen).
- Don't change member or kiosk routes, don't change anything in apps/api.
- Don't add a UI library beyond what's already in the project (Tailwind + shadcn/ui).

Functional requirements:
1. Exercise list showing name, muscle group, and an "available"/"unavailable" badge (using the
   data catalog.list already returns computed).
2. Equipment list with a per-item availability toggle (switch).
3. Exercise registration form (name, muscle group, instructions, linked equipment).
4. Equipment registration form (name).

Acceptance criteria:
- The equipment toggle updates the UI and reconciles with the server (React Query invalidation),
  with no manual page reload required.
- The exercise form blocks submit if the name is empty, with a visible error message.
- The screen is usable at mobile viewport (NFR-1) without breaking the layout.
- All three states of every query (loading, error, empty) are handled explicitly - nothing
  silently renders undefined (rules/error-handling.md).

Tests:
- This project doesn't use component testing (rules/testing.md) - validation is manual: bring up
  docker compose and navigate to /catalog logged in as the seeded admin.

Final response:
- Respond in at most 10 lines with files created, manual validation steps, and pending items.
