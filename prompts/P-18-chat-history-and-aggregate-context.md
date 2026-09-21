Blocked by: P-16
Covers: FR-28, FR-29
MVP: 3
Artifacts: apps/api/src/modules/chat/ (context enrichment), an aggregate helper in apps/api/src/modules/plans/
Evidence: Vitest: the aggregate contains no member identity and correct counts, and the chat context includes both the history-based risk flags and the aggregate

Task: make the AI's feedback reflect the member's history and, when useful, what other members are doing today.

Context:
- FR-28 and FR-29 in docs/02-requirements.md. The AI flags risk from an old injury against today's exercises and can adapt a plan because the member reports a soccer game or similar. It can also factor in aggregate information about other members' plans when asked.
- The chat context builder and event schemas come from P-16.

Permitted scope:
- Only the files in Artifacts. No new dependencies.

Functional requirements:
1. Extend the chat system prompt and context so the AI receives the member's active injuries and medication changes next to today's exercises and is instructed to warn about conflicts and to propose a safer alternative from the available catalog.
2. plansService.getTodayAggregate() returns an anonymized summary of today's published plans: the top 10 exercises and top 5 muscle groups with counts, and never a member id or name.
3. Always include that compact aggregate in the chat and adjustment context, so a question such as "what is everyone doing today" can be answered without a second AI call.

Acceptance criteria:
- The aggregate is correct for a known set of plans and contains no identifying field.
- The built context contains the risk information and the aggregate.

Tests:
- Vitest against the test database plus a context builder unit test. Run only these tests.

Final response:
- Respond in at most 8 lines with files changed, tests run, and pending items.
