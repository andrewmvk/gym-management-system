# Naming Conventions

## Files

- **`apps/web` and `apps/api`**: kebab-case filenames — `plan-card.tsx`, `plan-service.ts`, `use-plan-history.ts`. The exported symbol is PascalCase (components/classes/types) or camelCase (functions/hooks) regardless of filename casing.
- **Next.js reserved files keep their fixed names**: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `middleware.ts`. Don't rename these.
- One React component per file. Co-locate a small subcomponent in the same file only if it's not used anywhere else; the moment a second consumer appears, give it its own file.
- `packages/shared`: same kebab-case rule for files exporting multiple things (`plan-schemas.ts`); a file exporting one type/schema may be named after it directly (`member.ts`).

## TypeScript identifiers

- `camelCase` — variables, functions, object properties, tRPC procedure names.
- `PascalCase` — types, interfaces, classes, enums, React components, zod schema constants that represent a type (`PlanSchema`).
- `UPPER_SNAKE_CASE` — true constants and env var names (`OPENROUTER_MODEL`, `KIOSK_API_KEY`).
- Booleans prefixed `is`/`has`/`should`/`can` (`isPending`, `hasLinkedEquipment`), never a bare adjective or negation (`disabled` not `notEnabled`).
- No abbreviations that aren't already domain terms from `docs/05-data-model.md` (e.g. `aptitudeStatus`, not `apStat`).

## Database

Table names are `snake_case` and prefixed by kind, fixed by `docs/05-data-model.md` — don't rename or reprefix them:

- **`d_` — dimension**: relatively static reference/master data describing a *who* or *what* (`d_users`, `d_user_policy`, `d_exercises`, `d_gym_equipment`, `d_turnstile_config`). Includes bridge/join tables between two dimensions (`d_exercise_equipment`).
- **`f_` — fact**: an event, transaction, or measurable occurrence tied to a point in time (`f_check_ins`, `f_training_plans`, `f_profile_events`, `f_user_policy_on_user`).

This split is about grain and change-frequency, not mutability — a fact row can be updated in place (a retroactive plan correction, revoking a policy grant), it just tends to change or accumulate far more often than a dimension row does.

When adding a new table, classify it the same way before naming it: does it describe a mostly-static entity (`d_`), or does it record something that *happened* (`f_`)? Column names stay `snake_case` without a prefix. In Drizzle schema code, the TS property is `camelCase` with an explicit column-name mapping, e.g.:

```ts
userId: uuid('user_id').references(() => dUsers.id)
```

One exception to `uuid` primary keys: `d_user_policy.id` is a `text` slug (`manage_onboarding`, `read_aptitude`, …), since it's referenced directly as a stable identifier in code rather than looked up — see `rules/database.md`.

## tRPC routers and procedures

Resource-first, verb-second: `plans.getToday`, `plans.adjust`, `certificates.review`, `checkins.submit`, `catalog.toggleEquipment`, `policies.list`, `policies.grant`, `policies.revoke`. Router files live in their domain module (see `rules/backend.md`) and are named after the resource, not the verb.

## Branches and commits

See `rules/git-conventions.md`.
