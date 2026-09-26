# Audit Log

Record of the **Auditor** role (Unit 1 §5/§7): each finding, where it was found, and whether it has
already been closed. Without this, an audit turns into a lost conversation instead of a verifiable
trail - the same reason `docs/08-traceability-matrix.md` exists for the Specifier role.

| # | Finding | Where | Status | Resolution |
|---|---|---|---|---|
| 1 | `policies.ts` path diverged between docs: `packages/shared/src/constants/policies.ts` vs `packages/shared/src/auth/constants/policies.ts` | `docs/05-data-model.md:55`, `rules/database.md:8` (wrong) vs `rules/backend.md:17`, `docs/04-architecture.md:128` (correct) | ✅ Resolved (2026-09-13) | Both wrong files were fixed to include `/auth/`, aligning with `AGENTS.md` (which already stated that all CASL code lives under `packages/shared/src/auth/`) |
| 2 | No definition of what happens to the `d_users` row of a permanently rejected member (`aptitude_status = rejected`) - FR-8 says "no account is created," but the row already exists since FR-1/FR-2 to hold the embedding/photo/email | `docs/02-requirements.md` FR-8, `docs/05-data-model.md` `d_users.password_hash` | ✅ Resolved (2026-09-13) | Decided: the e-mail stays permanently blocked after final rejection - no soft-delete/purge. FR-8 and `d_users.aptitude_status` updated |
| 3 | No defined mechanism for automatic retry of `pending_retry` (cron? new attempt only on page reload?) | `docs/03-features-and-flows.md` flow 1, step 4b ("system retries automatically") | ✅ Resolved (2026-09-13) | Decided: retry only when the member reopens the page/requests it again - no background job. FR-4 updated |
| 4 | No resume flow defined for an incomplete signup (applicant closes the browser before finishing; no login is possible before the password is set) | `docs/02-requirements.md` FR-1..FR-9 | ✅ Resolved (2026-09-13) | Decided: resume by e-mail, looking up an existing incomplete row before creating a new one. FR-1 and `d_users.email` updated |
| 5 | "Days trained"/"training frequency" in the metrics doesn't define whether it counts physical check-in or an exercise marked completed in the app - the two can diverge | `docs/05-data-model.md` §3, "Personal metrics" | ✅ Resolved (2026-09-13) | Decided: counts physical check-in only (`f_check_ins`), not exercises marked completed. FR-36 and data model §3 updated |

## Implementation decisions made without prior review

Findings 1-5 above are spec-level ambiguities, caught before any code existed. The entries below are a
different, later kind of gap: real interpretive calls made *while implementing* `P-06` and `P-07`, where
the prompt left room for judgment and the agent decided alone instead of checking first. Recorded here
so nothing stays silently baked into the code - review each and either confirm it or ask for a change.

| # | Prompt | Decision made | Status |
|---|---|---|---|
| 6 | P-06 | Invented the content of all 25 seeded exercises and 12 equipment items (names, muscle groups, instructions) - the prompt only required the counts and the availability mix, not the actual content | ⏳ Pending your review |
| 7 | P-06 | Added the shadcn `switch`, `badge`, and `checkbox` primitives to the frontend, reading "no new dependencies" in the prompt's permitted scope as about npm packages, not the project's own UI-kit generator | ⏳ Pending your review |
| 8 | P-07 | Chose the exact response shape of `aptitude.startSignup` (`status: 'created' \| 'resumed' \| 'email_blocked' \| 'already_registered'`) - the prompt described the four outcomes in prose, not as a concrete type | ⏳ Pending your review |
| 9 | P-07 | Invented the "coming soon" placeholder message shown to an applicant who resumes after the photo step is already done, since no later step exists yet to send them to | ⏳ Pending your review |
| 10 | P-07 | Made an invalid/expired `userId` in `savePhoto` return the same generic `unavailable` reason as a real embedding failure, instead of a distinct error - a security/UX call to avoid telling a caller which case it is | ⏳ Pending your review |

## How to close the open items

Items 2-5 aren't missing text - they are **decisions not yet made**. The right way to resolve them is
a short `/grilling` session focused only on these 4 points (not the whole spec again), because each one
is a yes/no question or a choice between options, exactly the format this skill was built to close. Once
decided, the answer becomes a new sentence in the relevant FR/RN, and this row changes to ✅ with the
date and the commit that updated the doc.
