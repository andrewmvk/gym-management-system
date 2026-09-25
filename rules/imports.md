# Imports

Every import uses an `@` path, never a relative one. No `./` and no `../`, for any kind of import: values, types, side effects, styles.

| Importing from | Use | Example |
|---|---|---|
| Inside `apps/web` | `@/` (maps to `apps/web/src/`) | `import { cn } from '@/lib/utils'` |
| Inside `apps/api` | `@api/` (maps to `apps/api/src/`) | `import { env } from '@api/config/env'` |
| Inside `packages/shared` | `@shared/` (maps to `packages/shared/src/`) | `import { POLICIES } from '@shared/auth/constants/policies'` |
| Another workspace package | its package name | `import type { AppRouter } from '@cadence/api'`, `import { defineAbilityFor } from '@cadence/shared'` |

Why each package has its own alias instead of all sharing `@/`: the web app type-checks the api's files (through the `AppRouter` type) and compiles the shared package's files, and both resolve aliases with the web's tsconfig. A plain `@/` inside `apps/api` or `packages/shared` would silently point into `apps/web/src`.

The aliases live in `tsconfig.base.json`; `apps/web/tsconfig.json` repeats them because Next.js needs its own `paths`. tsx, Vitest (`resolve.tsconfigPaths`), and Next.js all read them from there, so adding a new alias means editing those two files only.

Two exceptions, both outside `src/`: config files that must reference a file by path (`drizzle.config.ts`, `next.config.ts`, `vitest.config.ts`), and generated migrations.
