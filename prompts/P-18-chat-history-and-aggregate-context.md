Blocked by: P-16
Covers: FR-28, FR-29 (the anonymized aggregate for chat; the demand given to plan generation is P-13's)
MVP: 3
Artifacts: apps/api/src/modules/chat/ (context enrichment), an aggregate helper in apps/api/src/modules/plans/
Evidence: Vitest: the aggregate contains no member identity and correct counts (capped at the top 10 exercises and top 5 muscles, empty when no plan exists), the chat context includes the history-based risk flags next to today's plan and the aggregate, an injury or a medication change is never folded into the older-events count and an old unresolved one stays in the detailed block even when 50 newer events push it out of the window

Task: make the AI's feedback reflect the member's history and, when useful, what other members are doing today.

Context:
- FR-28 and FR-29 in docs/02-requirements.md. The AI flags risk from an old injury against today's exercises and can adapt a plan because the member reports a soccer game or similar. It can also factor in aggregate information about other members' plans when asked.
- Two different things are given to the AI about other members. The chat gets the anonymized aggregate below, to answer "what is everyone doing today" without a second AI call. Plan generation instead gets the demand of other members' plans for the plan date, counted in plans per equipment piece with their muscle load, to spread a broad goal across the equipment (P-13); the Overview shows the same demand to staff (P-30).
- The chat context builder and event schemas come from P-16. Injuries and medication changes that are still unresolved are active health events: always given in detail next to today's plan, however old, and never folded into the summary of older events.

Permitted scope:
- Only the files in Artifacts. No new dependencies.

Functional requirements:
1. Extend the chat system prompt and context so the AI receives the member's active injuries and medication changes (unresolved, of any age) next to today's exercises and is instructed to warn about conflicts and to propose a safer alternative from the available catalog. The summary of older events counts only the other event types.
2. plansService.getTodayAggregate() returns an anonymized summary of today's published plans: the top 10 exercises and top 5 muscles (weighted sets, since P-29) with counts, and never a member id or name.
3. Always include that compact aggregate in the chat and adjustment context, so a question such as "what is everyone doing today" can be answered without a second AI call.

Acceptance criteria:
- The aggregate is correct for a known set of plans and contains no identifying field.
- The built context contains the risk information and the aggregate.
- An old injury or medication change appears in full in the context and is not counted in the older-events summary.

Tests:
- Vitest against the test database plus a context builder unit test. Run only these tests.

Final response:
- Respond in at most 8 lines with files changed, tests run, and pending items.
