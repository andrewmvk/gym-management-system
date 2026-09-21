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
| [P-04](./P-04-ai-module.md) | AI module | shared base for every AI feature (aptitude, certificate, plan, chat) | 2 | P-01 | Andrew |
| [P-05](./P-05-platform-adapters.md) | Platform adapters | shared base for file uploads, e-mail, and face embedding; NFR-3 (upload validation) | 2 | P-03 | Andrew |
| [P-06](./P-06-exercise-catalog.md) | Exercise catalog | FR-16, FR-17, FR-24 | 1 | P-03 | Heitor |
| [P-07](./P-07-signup-identity-and-photo.md) | Signup identity and photo | FR-1, FR-2 | 2 | P-02, P-05 | Heitor |
| [P-08](./P-08-aptitude-evaluation.md) | Aptitude evaluation | FR-3, FR-4 | 2 | P-04, P-07 | Heitor |
| [P-09](./P-09-account-activation.md) | Account activation | FR-9 | 2 | P-03, P-08 | Heitor |
| [P-10](./P-10-certificate-review-and-rejection.md) | Certificate review and rejection | FR-5, FR-6, FR-7, FR-8 | 3 | P-03, P-05, P-08, P-09 | Heitor |
| [P-11](./P-11-onboarding-data-capture.md) | Onboarding data capture | FR-12, FR-13, FR-14 | 2 | P-03, P-05 | Heitor |
| [P-12](./P-12-onboarding-invite-and-gate.md) | Onboarding invite and gate | FR-10, FR-11 | 2 | P-05, P-09, P-11 | Heitor |
| [P-13](./P-13-plan-generation.md) | Plan generation | FR-15, FR-18 | 2 | P-04, P-06, P-11 | Heitor |
| [P-14](./P-14-plan-view-and-history.md) | Plan view and history | FR-20 | 2 | P-13 | Heitor |
| [P-15](./P-15-trainer-review.md) | Trainer review | FR-19, FR-22 | 3 | P-13 | Heitor |
| [P-16](./P-16-chat-and-fact-memory.md) | Chat and fact memory | FR-25, FR-26, FR-27 | 3 | P-04, P-11, P-13 | Heitor |
| [P-17](./P-17-chat-plan-adjustment.md) | Chat plan adjustment | FR-21, FR-23 | 3 | P-15, P-16 | Heitor |
| [P-18](./P-18-chat-history-and-aggregate-context.md) | Chat history and aggregate context | FR-28, FR-29 | 3 | P-16 | Heitor |
| [P-19](./P-19-kiosk-embeddings-and-matching.md) | Kiosk embeddings and matching | FR-31, FR-32 | 3 | P-02, P-05 | Andrew |
| [P-20](./P-20-checkin-and-turnstile.md) | Check-in and turnstile | FR-33, FR-35 | 3 | P-03, P-19 | Andrew |
| [P-21](./P-21-kiosk-capture-ui.md) | Kiosk capture UI | FR-30, FR-34 | 3 | P-19, P-20 | Andrew |
| [P-22](./P-22-real-face-embedding.md) | Real face embedding | the real implementation behind the signup embedding interface (upgrade of the stub) | 3 | P-05 | Andrew |
| [P-23](./P-23-policy-management.md) | Policy management | FR-43 | 4 | P-03 | Andrew |
| [P-24](./P-24-member-metrics-and-membership.md) | Member metrics and membership | FR-36, FR-40 | 4 | P-14, P-20 | Heitor |
| [P-25](./P-25-gym-info.md) | Gym info | FR-37, FR-38, FR-39 | 4 | P-06, P-13, P-14, P-20 | Heitor |
| [P-26](./P-26-demo-data-readme-and-docs-sync.md) | Demo data, README and docs sync | the demo data described in docs/04-architecture.md §8, and the "Keeping docs in sync" rule in AGENTS.md | 5 | all other prompts | Heitor |

## Distribution (requirements and stages)

Total: 26 prompts covering all 44 functional requirements exactly once.

| Owner | Prompts | Functional requirements | Non-functional requirements (primary) |
|---|---|---|---|
| Andrew | 10 | 10 of 44 | NFR-1, NFR-3, NFR-5 |
| Heitor | 16 | 34 of 44 | none as primary |

NFR-1 (responsive UI) is listed once, on the foundation prompt P-03, but it applies to every screen of every prompt. NFR-2 has no dedicated work. NFR-4 and NFR-6 are explicit non-goals.

| Stage | Andrew | Heitor | Total |
|---|---|---|---|
| MVP 1 | 3 | 1 | 4 |
| MVP 2 | 2 | 7 | 9 |
| MVP 3 | 4 | 5 | 9 |
| MVP 4 | 1 | 2 | 3 |
| MVP 5 | 0 | 1 | 1 |

Counting requirements alone understates the base work: P-01 to P-05 have no functional requirement of their own but every other prompt depends on them.

## Parallel waves

A wave only needs prompts from earlier waves, so everything inside a wave can run at the same time.

- **Wave 0**: P-01
- **Wave 1**: P-02, P-04
- **Wave 2**: P-03
- **Wave 3**: P-05, P-06, P-23
- **Wave 4**: P-07, P-11, P-19, P-22
- **Wave 5**: P-08, P-13, P-20
- **Wave 6**: P-09, P-14, P-15, P-16, P-21
- **Wave 7**: P-10, P-12, P-17, P-18, P-24, P-25
- **Wave 8**: P-26
