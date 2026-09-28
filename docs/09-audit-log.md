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

| 11 | No gender/sex field anywhere in the spec - never asked for in the original grill-me session | `docs/02-requirements.md` (pre-FR-45) | ✅ Resolved (2026-09-26) | Decided: optional field, `female`/`male`/`prefer_not_to_say`, used only to inform AI plan recommendations. Added FR-45 and the `gender` column; implemented in `P-27` (fixes `P-07`) |
| 12 | No LGPD consent flow for facial biometric capture, even though the system computes and stores a face embedding - LGPD Art. 11 requires specific, highlighted consent for sensitive/biometric data | `docs/02-requirements.md` FR-2, `docs/05-data-model.md` `d_users.reference_face_embedding` | ✅ Resolved (2026-09-26) | Decided: an explicit consent screen before photo capture, recorded permanently in a new `f_consent_events` table (who, when, which text version), embedding computation refused without it. Added FR-46 and RN-12; implemented in `P-28` (fixes `P-07`) |
| 13 | FR-12 lists "any other free-form relevant info" as part of onboarding, but `f_onboarding_submissions` in `docs/05-data-model.md` has no column for it - flagged by `P-11`'s own prompt text, not discovered independently | `docs/02-requirements.md` FR-12, `docs/05-data-model.md` `f_onboarding_submissions` | ✅ Resolved (2026-09-26) | Decided (per the prompt's own instruction, confirmed before implementing): store it as an `otherNotes` string inside the `physical_conditions` jsonb column's zod schema instead of adding a new table column. Implemented in `P-11` |
| 14 | The AI module (`P-04`) only ever sends `system`/`user` text to OpenRouter - there is no mechanism to transmit an uploaded image's actual content. `P-10`'s certificate "AI review" therefore cannot inspect what the certificate document actually says, only its filename and MIME type | `apps/api/src/modules/ai/` (client/structured-runner have no image/attachment support), `apps/api/src/modules/aptitude/certificate-service.ts` | ⚠️ Decision made, capability gap still open | Decided (flagged and confirmed with the user before implementing, not discovered mid-task): keep calling the AI module for the `certificate` purpose so `AI_MOCK_CERTIFICATE` and the mock/live switch both keep working, but its prompt tells it plainly that it can't see the file and to default to `not_cleared` so a human reviews it - RN-02's admin queue is the real gate either way, in both mock and live mode. Extending the AI module for real vision input (a vision-capable OpenRouter model, an image-carrying request shape) is out of scope for `P-10` and would need its own prompt (`Fixes: P-04`) if the course ever asks for real certificate content review |
| 15 | A bare CASL subject-type check (e.g. `ability.can('read', 'TrainingPlan')`, no instance) matches ANY rule for that action+type, conditions included - it can't test a conditioned (self-scope) rule's fields without a real object, so it optimistically lets it through. `reviews.queue`/`reviews.getPlan` (`P-15`) initially used exactly this, which would have let a plain member (holding only the self-scoped `read_own_plans`) through to view every member's plans - caught by the router test written for the prompt's own "a member cannot call any reviews.* procedure" acceptance criterion, before it ever shipped | `apps/api/src/modules/plans/reviews-router.ts` | ✅ Resolved (2026-09-27) | Fixed: pass `subject('TrainingPlan', {})` (a real, empty-but-typed object) instead of the bare string - a conditioned rule's `{userId: ...}` check then correctly fails to match (no `userId` field present), so only an unconditioned `read_all_plans`-style grant passes. **Any future prompt checking a resource that has both a self-scope and an all-scope policy (e.g. `P-24`'s Metrics) needs the same pattern**, not a bare type string |

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
