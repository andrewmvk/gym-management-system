Blocked by: P-04, P-06, P-11
Covers: FR-15, FR-18
MVP: 2
Artifacts: apps/api/src/db/schema/plans.ts (plan tables and f_profile_events), migration, apps/api/src/modules/plans/{router,service,repository}.ts (generation part), a call added to the onboarding submit flow
Evidence: Vitest: a generated plan contains only available exercises, an AI failure surfaces a retryable error, the placeholder generator works without AI, regenerating the same date replaces an AI plan but not a trainer-edited one without confirmation

Task: implement plan generation from onboarding data, accumulated history, and the catalog, published immediately.

Context:
- FR-15 and FR-18 in docs/02-requirements.md, the plan tables in docs/05-data-model.md (f_training_plans, f_plan_reviews, f_training_plan_exercises) plus f_profile_events, and rules/backend.md (AI module, availability predicate).
- Plans publish at once and never wait for trainer review. The AI chooses only from the curated catalog, and only exercises that pass the availability predicate from P-06.
- The AI context is assembled fresh on every call from the database: member profile (age from birthdate), all onboarding submissions, every f_profile_events row, and the last 14 days of plans. f_profile_events is created here and stays empty until P-16.

Permitted scope:
- Only the files in Artifacts, the schema/index.ts and router registrations, and one call in the onboarding submit service. No new dependencies.
- Don't build the member plan screen (P-14) or trainer review (P-15).

Functional requirements:
1. Plan tables as in docs/05-data-model.md, with a unique constraint on (user_id, plan_date), and f_profile_events with its event_type enum.
2. plansService.generateForDate(userId, date): assemble the context, call the AI module with the plan purpose and a zod schema of { exercises: [{ exerciseId, sets, reps, load?, notes? }] }, validate that every exerciseId exists and passes the predicate (discard others; if none remain use the placeholder), and persist the plan as status ai_published with ordered exercises. An existing ai_published plan for that date is replaced; a trainer_edited plan is refused unless confirmOverwrite is true (the guard is completed in P-15).
3. PLAN_GENERATOR=placeholder (default when AI_MODE=mock) picks 3 to 5 available exercises across different muscle groups deterministically, so the flow works end to end without AI.
4. Procedure plans.generateToday for the signed-in member. When the AI is unavailable throw TRPCError INTERNAL_SERVER_ERROR with the message "AI is temporarily unavailable" (rules/error-handling.md).
5. After a successful onboarding submission, call generateForDate for today, best effort: a failure is logged and the member can retry with plans.generateToday.

Acceptance criteria:
- No exercise whose equipment is all unavailable ever appears in a generated plan.
- The placeholder path and the AI path both persist a valid plan; an AI failure creates no partial plan.
- Regenerating a date twice leaves one plan row for that date.

Tests:
- Vitest against the test database with the AI mock and the placeholder. Run only the plans tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
