# Testing

`docs/02-requirements.md` doesn't mandate a test suite (academic, non-deployed scope) - testing effort here is deliberately scoped to high-value business logic, not exhaustive coverage.

## Tooling

Vitest only. No component-testing library, no Playwright/e2e. Verify user-facing flows manually against the running Docker Compose stack instead.

## What gets tests

Pure, easy-to-get-subtly-wrong logic with no UI:

- Aptitude/certificate result resolution - `cleared`/`not_cleared`/`pending_retry` never coalescing into each other (`rules/error-handling.md`).
- Exercise availability rule (FR-17): no-equipment-needed OR ≥1 linked equipment available.
- Occupancy rolling-window query (FR-37).
- Face-match threshold/ambiguity decision (best vs. second-best candidate).
- Retroactive correction overwrite behavior (FR-23) and that metrics reflect the corrected version.
- Turnstile-call-failure still records a check-in, tagged `failed` (FR-33/34).
- Effective-permission resolution (FR-42): building a user's CASL ability from `f_user_policy_on_user`/`d_user_policy` correctly excludes expired grants, applies `denied` as an override, and translates `scope: 'self'` into the right condition - a subtle bug here silently grants or denies the wrong thing.

## Conventions

- Test files co-located next to the code under test: `plan-service.ts` + `plan-service.test.ts` in the same folder - not a parallel `__tests__` tree.
- Mock only the true external boundary: OpenRouter, the turnstile REST API, the email provider. Don't mock the database - tests needing DB state run against a real Postgres instance (a test database, not the dev one), so a query bug can't hide behind a mock that quietly diverges from real behavior.
