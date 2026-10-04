# Prompt Catalog

These are the registered prompts that generate the system (a first generation, not a production build). Each one is a self-contained vertical slice of one to four functional requirements (schema, backend, screen, and tests), small enough to fit in an agent's context. Every prompt starts with a `Blocked by:` line, so the team can see what can run in parallel and where there is a real queue.

Each prompt follows `_template.md`. The full requirement to prompt to artifact to evidence table is in [`docs/08-traceability-matrix.md`](../docs/08-traceability-matrix.md).

## How to work with it

1. Pick a prompt whose `Blocked by:` prompts are all done.
2. Send that one prompt to the agent, and only that one.
3. Audit the diff against the prompt's "Permitted scope" and run its "Tests" and "Evidence".
4. Record the result in `docs/08-traceability-matrix.md` (Status column) in the same pull request, and use a branch per prompt (for example `feature/fr-17-p06-exercise-catalog`, see `rules/git-conventions.md`).

The owner column below is the default. It is meant to be dynamic: if someone is stuck or slow on a prompt, the other person can pull it ahead of time. To do that, change the Owner cell of that row in the same pull request.

A prompt is a specification, not a contract. If the implementation has to deviate, update the prompt and the affected docs together (see "Keeping docs in sync" in `AGENTS.md`).

## Index

| Prompt | Title | Covers | MVP | Blocked by | Default owner |
|---|---|---|---|---|---|
| [P-01](./P-01-monorepo-and-containers.md) | Monorepo and containers | NFR-3, NFR-5 | 1 | none | Andrew |
| [P-02](./P-02-database-policies-and-seed.md) | Database policies and seed | FR-41, FR-42 | 1 | P-01 | Andrew |
| [P-03](./P-03-auth-and-route-guards.md) | Auth and route guards | FR-44, NFR-1, NFR-3 | 1 | P-02 | Andrew |
| [P-04](./P-04-ai-module.md) | AI module | shared base for every AI feature (aptitude, certificate, plan, chat; the first two are removed by P-31) | 2 | P-01 | Andrew |
| [P-05](./P-05-platform-adapters.md) | Platform adapters | shared base for file uploads, e-mail, and face embedding; NFR-3 (upload validation) | 2 | P-03 | Andrew |
| [P-06](./P-06-exercise-catalog.md) | Exercise catalog | FR-16, FR-17, FR-24 | 1 | P-03 | Heitor |
| [P-07](./P-07-signup-identity-and-photo.md) | Signup identity and photo | FR-1, FR-2 | 2 | P-02, P-05 | Heitor |
| [P-08](./P-08-aptitude-evaluation.md) | Aptitude evaluation | FR-3, FR-4 | 2 | P-04, P-07 | Heitor |
| [P-09](./P-09-account-activation.md) | Account activation | FR-9 | 2 | P-03, P-08 | Heitor |
| [P-10](./P-10-certificate-review-and-rejection.md) | Certificate review and rejection | FR-5, FR-6, FR-7, FR-8 | 3 | P-03, P-05, P-08, P-09 | Heitor |
| [P-11](./P-11-onboarding-data-capture.md) | Onboarding data capture | FR-12, FR-13, FR-14 | 2 | P-03, P-05 | Heitor |
| [P-12](./P-12-onboarding-invite-and-gate.md) | Onboarding invite and gate | FR-10, FR-11 | 2 | P-05, P-09, P-11 | Heitor |
| [P-13](./P-13-plan-generation.md) | Plan generation | FR-15, FR-18, FR-59 | 2 | P-04, P-06, P-11 | Heitor |
| [P-14](./P-14-plan-view-and-history.md) | Plan view and history | FR-20 (with FR-59 for the upcoming and past plan views) | 2 | P-13 | Heitor |
| [P-15](./P-15-trainer-review.md) | Trainer review | FR-19, FR-22, FR-60 | 3 | P-13 | Heitor |
| [P-16](./P-16-chat-and-fact-memory.md) | Chat and fact memory | FR-25, FR-26, FR-27, FR-58 | 3 | P-04, P-11, P-13 | Heitor |
| [P-17](./P-17-chat-plan-adjustment.md) | Chat plan adjustment | FR-21, FR-23 | 3 | P-15, P-16 | Heitor |
| [P-18](./P-18-chat-history-and-aggregate-context.md) | Chat history and aggregate context | FR-28, FR-29 | 3 | P-16 | Heitor |
| [P-19](./P-19-kiosk-embeddings-and-matching.md) | Kiosk embeddings and matching | FR-31, FR-32 | 3 | P-02, P-05 | Andrew |
| [P-20](./P-20-checkin-and-turnstile.md) | Check-in and turnstile | FR-33, FR-35, FR-61 | 3 | P-03, P-19 | Andrew |
| [P-21](./P-21-kiosk-capture-ui.md) | Kiosk capture UI | FR-30, FR-34 | 3 | P-19, P-20 | Andrew |
| [P-22](./P-22-real-face-embedding.md) | Real face embedding | the real implementation behind the signup embedding interface (upgrade of the stub) | 3 | P-05 | Andrew |
| [P-23](./P-23-policy-management.md) | Policy management and groups | FR-43, FR-47, FR-48 | 4 | P-03, P-09 | Andrew |
| [P-24](./P-24-member-metrics-and-membership.md) | Member metrics and membership | FR-36, FR-40 (with FR-60 for the staff Member page and the membership switch) | 4 | P-14, P-20 | Heitor |
| [P-25](./P-25-gym-info.md) | Gym info | FR-37, FR-38, FR-39, FR-62 | 4 | P-06, P-13, P-14, P-20 | Heitor |
| [P-26](./P-26-demo-data-readme-and-docs-sync.md) | Demo data, README and docs sync | the demo data described in docs/04-architecture.md §8, and the "Keeping docs in sync" rule in AGENTS.md | 5 | all other prompts | Heitor |
| [P-27](./P-27-signup-gender-field.md) | Signup gender field (fixes P-07) | FR-45 | 2 | none | Heitor |
| [P-28](./P-28-biometric-consent.md) | Biometric consent (fixes P-07) | FR-46, RN-12 | 2 | none | Heitor |
| [P-29](./P-29-muscle-map.md) | Muscle map | FR-49, FR-50, FR-51, FR-52 (and the rewording of FR-16, FR-20, FR-24, FR-36, FR-38) | 4 | P-06, P-13, P-14, P-24, P-25 | Heitor |
| [P-30](./P-30-must-review-and-overview.md) | Must-review plans, plan review preview, member Now and staff Overview | FR-53, FR-54, FR-55, FR-56, RN-14 | 4 | P-29, P-15, P-14 | Heitor |
| [P-31](./P-31-in-person-registration.md) | In-person registration (planned, nothing implemented; fixes P-07, P-08, P-09, P-10, P-12) | FR-57 (and the rewording of FR-1, FR-9 to FR-12, FR-44, FR-46, RN-12; removes FR-3 to FR-8, RN-02, RN-03) | 4 | P-30 | Andrew |

`P-31` is the planned rework that brings the registration code in line with the in-person model (`Fixes: P-07, P-08, P-09, P-10, P-12`, audit-log item 20). It supersedes parts of `P-07` to `P-10` and `P-12`, which carry a `Status:` note saying so. The 2026-10-04 critique (audit-log item 21) did not get a prompt of its own: it amended the prompts it affected (`P-04`, `P-05`, `P-11`, `P-13` to `P-21`, `P-23` to `P-26`, `P-29`, `P-30`), and its new requirements FR-58 to FR-62 are owned by `P-16`, `P-13`, `P-15`, `P-20` and `P-25` respectively.

`P-27` and `P-28` are correction prompts (`Fixes: P-07`, see `_template.md` and `docs/09-audit-log.md` findings 11-12): FR-45 and FR-46 didn't exist in the original 44 requirements, so these were added later rather than fitting into the original wave plan below.

## Distribution (requirements and stages)

Total: 31 prompts covering the functional requirements FR-1..FR-62 (44 original + 2 added by `P-27`/`P-28` + 2 added by the policy groups amendment of `P-23` + 4 added by `P-29` + 4 added by `P-30` + 6 added by the 2026-10-04 changes: FR-57 owned by `P-31`, and FR-58 to FR-62 owned by the amended prompts `P-16`, `P-13`, `P-15`, `P-20` and `P-25`, see `docs/09-audit-log.md`). Requirement ids are never renumbered: FR-3 to FR-8 stay as tombstones (removed by audit-log item 20, executed by `P-31`), so 56 requirements are active. `P-29`, `P-30` and the other amended prompts also reword existing requirements, which stay counted under the prompts that originally covered them. `P-31` supersedes parts of `P-07`, `P-08`, `P-09`, `P-10` and `P-12` (`P-08` and `P-10` entirely), which carry a `Status:` note saying so; it is planned and nothing of it is implemented.

The owner and stage counts below are computed from the index above: prompts are counted per Default owner and per MVP stage, and each active functional requirement is counted once, under the prompt that lists it as its own (not as a rewording or a "with"), so the requirement split follows the owner of that prompt.

| Owner | Prompts | Functional requirements (active) | Non-functional requirements (primary) |
|---|---|---|---|
| Andrew | 11 | 14 of 56 | NFR-1, NFR-3, NFR-5 |
| Heitor | 20 | 42 of 56 | none as primary |

NFR-1 (responsive UI) is listed once, on the foundation prompt P-03, but it applies to every screen of every prompt. NFR-2 has no dedicated work. NFR-4 and NFR-6 are explicit non-goals.

| Stage | Andrew | Heitor | Total |
|---|---|---|---|
| MVP 1 | 3 | 1 | 4 |
| MVP 2 | 2 | 9 | 11 |
| MVP 3 | 4 | 5 | 9 |
| MVP 4 | 2 | 4 | 6 |
| MVP 5 | 0 | 1 | 1 |

Counting requirements alone understates the base work: P-01 to P-05 have no functional requirement of their own but every other prompt depends on them.

## Parallel waves

A wave only needs prompts from earlier waves, so everything inside a wave can run at the same time.

- **Wave 0**: P-01
- **Wave 1**: P-02, P-04
- **Wave 2**: P-03
- **Wave 3**: P-05, P-06
- **Wave 4**: P-07, P-11, P-19, P-22, P-27, P-28 (the last two only after P-07 lands, even though they list no formal `Blocked by`)
- **Wave 5**: P-08, P-13, P-20
- **Wave 6**: P-09, P-14, P-15, P-16, P-21
- **Wave 7**: P-10, P-12, P-17, P-18, P-23 (it moved here from wave 3 once it began replacing P-09's direct member grants with the member group), P-24, P-25
- **Wave 8**: P-26, P-29
- **Wave 9**: P-30
- **Wave 10**: P-31 (it reworks flows that waves 4 to 7 built, so it only runs after the prompts that touched the same files)
