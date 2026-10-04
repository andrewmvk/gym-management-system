Blocked by: P-04, P-06, P-11
Covers: FR-15, FR-18, FR-59 (the AI failure and the ticks parts), the rewording of FR-15, FR-22 and FR-29, RN-01, RN-06, RN-16
MVP: 2
Artifacts: apps/api/src/db/schema/plans.ts (plan tables and f_profile_events with its resolved_at column), migrations, apps/api/src/modules/plans/{router,service,repository}.ts (generation part, the prompt context, the demand of other members), a call added to the onboarding submit flow
Evidence: Vitest: a generated plan contains only available exercises, an AI failure (or an answer with no usable catalog exercise) throws the retryable error and saves no plan, the placeholder generator works without AI, regenerating the same date leaves one plan row, a trainer-edited plan returns needs_confirmation with reason trainer_edited without confirmation, a plan with ticked exercises returns reason has_completed and keeps all its rows, a confirmed regeneration keeps the tick of an exercise that stays, the prompt carries the last 14 days with done and not done and the check-in dates, the trainer notes, the other members' demand counted in plans and skips resolved facts, computePlanDemand counts plans and not exercise rows
Status: Partly superseded by P-31 (audit-log item 20): the questionnaire block is removed from the prompt context (the code and its test still carry it), and the context gains the member's height, weight and typed exam findings

Task: implement plan generation from onboarding data, accumulated history, trainer notes and the demand of other members, published immediately and never replaced by a made-up plan when the AI fails.

Context:
- FR-15, FR-18 and FR-59 in docs/02-requirements.md, the plan tables in docs/05-data-model.md (f_training_plans, f_plan_reviews, f_training_plan_exercises) plus f_profile_events, and rules/backend.md (AI module, availability predicate).
- Plans publish at once and never wait for trainer review. The AI chooses only from the curated catalog, and only exercises that pass the availability predicate from P-06.
- The AI context is assembled fresh on every call from the database, never from a chat transcript: the member profile (age from birthdate); the onboarding submissions, newest first, the first being the current truth; the remembered facts that are still unresolved (f_profile_events rows with resolved_at null, in detail, injuries and medication changes however old; f_profile_events is created here and filled by P-16); the muscle focus (P-29); the last 14 days of plans with their exercises, sets x reps, load and, for dates before today, done or not done, plus the member's check-in dates; the member's latest trainer notes and edits, as guidance from their trainer (FR-19); and the demand of other members' plans for that plan date, counted in plans (never exercise rows or sets) per working equipment piece plus their muscle load, so a broad goal is spread across different equipment and an overloaded piece is avoided (FR-29). Safety, injuries, medication and muscle focus always win over spreading.
- An AI failure is its own state, never a plan (RN-01, FR-59): when the live AI returns nothing usable, or nothing that survives the catalog check, generation fails with "AI is temporarily unavailable" and saves nothing. The deterministic placeholder is the plan generator only in placeholder mode (the mock and demo mode).
- Ticked exercises are never silently lost (RN-16, FR-59): a regeneration keeps `completed` for the exercises that remain, matched by exercise, and replacing a plan that holds ticks or a trainer's edit needs the member's confirmation first (RN-06, FR-22).

Permitted scope:
- Only the files in Artifacts, the schema/index.ts and router registrations, and one call in the onboarding submit service. No new dependencies.
- Don't build the member plan screen (P-14) or trainer review (P-15).

Functional requirements:
1. Plan tables as in docs/05-data-model.md, with a unique constraint on (user_id, plan_date), and f_profile_events with its event_type enum and the nullable resolved_at (set when the member says a fact no longer applies, P-16).
2. plansService.generateForDate(userId, date, confirmOverwrite, overrides): when a plan exists and confirmOverwrite is not true, return { status: "needs_confirmation", reason: "trainer_edited" | "has_completed", editedBy, editedAt, completedCount } as data and not an exception (the trainer edit comes first when both apply; editedBy and editedAt are null for has_completed). Otherwise assemble the context, call the AI module with the plan purpose and a zod schema of { exercises: [{ exerciseId, sets, reps, load?, notes? }] }, keep only exerciseIds that exist and pass the predicate, and fail with the retryable error when none remain. Persist the plan as status ai_published with ordered exercises, replacing the previous exercise list in place and keeping the `completed` flag of every exercise that stays. An optional instruction (from chat, P-17) is appended to the prompt.
3. PLAN_GENERATOR=placeholder (default when AI_MODE=mock) picks 3 to 5 available exercises across different muscles deterministically, so the flow works end to end without AI (grouped by lead muscle and ordered by the member's muscle focus since P-29). It is used only in this mode, never as the fallback of an AI failure.
4. Procedure plans.generateToday({ confirmOverwrite }) for the signed-in member. When the AI is unavailable throw TRPCError INTERNAL_SERVER_ERROR with the message "AI is temporarily unavailable" (rules/error-handling.md).
5. After a successful onboarding submission, call generateForDate for today without confirmation, best effort: a failure is logged and the member can retry with plans.generateToday, and a needs_confirmation answer is skipped, so the automatic regeneration never overwrites a plan with ticks or a trainer edit.

Acceptance criteria:
- No exercise whose equipment is all unavailable ever appears in a generated plan.
- The placeholder path and the AI path both persist a valid plan; an AI failure, or an answer with no usable exercise, creates no plan and no partial plan.
- Regenerating a date twice leaves one plan row for that date.
- A plan with ticked exercises, or a trainer-edited plan, is not replaced without confirmation, and after a confirmed regeneration an exercise that stays is still ticked.
- The prompt names the other members' demand in plans, the trainer notes, the unresolved facts and the history with done marks, and leaves out resolved facts.

Tests:
- Vitest against the test database with the AI mock and the placeholder. Run only the plans tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
