# Testing

`docs/02-requirements.md` doesn't mandate a test suite (academic, non-deployed scope) - testing effort here is deliberately scoped to high-value business logic, not exhaustive coverage.

## Tooling

Vitest only. No component-testing library, no Playwright/e2e. Verify user-facing flows manually against the running Docker Compose stack instead.

## What gets tests

Pure, easy-to-get-subtly-wrong logic with no UI:

- Inactive membership (FR-40, RN-15): login refused only after a correct password, an existing session stopping, and the kiosk refusing with no turnstile call and no check-in row.
- Completed exercises preserved (RN-16): regenerating or trainer-editing a plan keeps `completed` for exercises that remain, and asks for confirmation first when ticks exist.
- AI failure saves no plan (FR-15, RN-01): a live AI that returns nothing usable fails the generation with the unavailable error and writes no plan row, never falling back to the placeholder.
- Exercise availability rule (FR-17): no-equipment-needed OR ≥1 linked equipment available.
- Occupancy rolling-window query counting distinct members (FR-37).
- Face-match threshold/ambiguity decision (best vs. second-best candidate).
- Retroactive correction overwrite behavior (FR-23) and that metrics reflect the corrected version.
- Turnstile-call-failure still records a check-in, tagged `failed` (FR-33/34).
- Effective-permission resolution (FR-42): building a user's CASL ability from `f_user_policy_on_user`/`d_user_policy` and from group memberships (`f_user_policy_group_on_user`) correctly excludes expired grants and memberships, applies `denied` as an override (including over a policy that arrives through a group), and translates `scope: 'self'` into the right condition - a subtle bug here silently grants or denies the wrong thing.

## Conventions

- Test files co-located next to the code under test: `plan-service.ts` + `plan-service.test.ts` in the same folder - not a parallel `__tests__` tree.
- Mock only the true external boundary: OpenRouter, the turnstile REST API, the email provider. Don't mock the database - tests needing DB state run against a real Postgres instance (a test database, not the dev one), so a query bug can't hide behind a mock that quietly diverges from real behavior.
