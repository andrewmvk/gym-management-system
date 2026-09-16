# Git Conventions

Small team, feature branches + PRs.

## Branches

`feature/<short-slug>`, or `feature/fr-<n>-<slug>` when the branch maps directly to one or a few requirement IDs from `docs/02-requirements.md` (e.g. `feature/fr-17-equipment-availability`) - cheap traceability for a small team working off the same requirements doc. `fix/<slug>` for bug fixes, `chore/<slug>` for non-functional work (tooling, docs).

## Commits

Conventional Commits: `type(scope): subject`, imperative mood, no trailing period.

- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
- Scope: the domain module or app the change lives in (`plans`, `checkins`, `web`, `api`, `db`).
- Body (when the change isn't self-evident): explain *why*, not what - the diff already shows what changed.

Example: `feat(plans): warn before regenerating a trainer-edited plan`

## PRs

One feature branch per FR (or a cohesive slice of a flow) merged via PR into `master`. PR description references the FR id(s) it implements. Review isn't mandatory given team size, but PRs stay the norm for feature work - direct commits to `master` are reserved for docs-only or config-only fixes. No force-push to `master`.
