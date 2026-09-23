Blocked by: P-04, P-11, P-13
Covers: FR-25, FR-26, FR-27
MVP: 3
Artifacts: packages/shared/src/schemas/profile-events.ts, apps/api/src/modules/chat/{router,service,repository}.ts, chat panel in apps/web/src/app/(member)/
Evidence: Vitest with the AI mock: facts are persisted with the right event types, an AI failure stores nothing and returns the retryable error, no chat or message table exists, and the context builder includes earlier facts; manual: the chat panel forgets its messages on reload

Task: implement the AI chat that reads the member's full history, replies, and turns each message into durable structured facts.

Context:
- FR-25 to FR-27 in docs/02-requirements.md, docs/04-architecture.md §4, and f_profile_events in docs/05-data-model.md (created empty in P-13). Principle 2 in AGENTS.md: future plans reason from the accumulated facts, never from a raw transcript.
- There is no server-side conversation or session object and no persisted chat log. The UI keeps messages only in component state (FR-26). Durability lives entirely in f_profile_events.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.
- Don't build plan adjustment (P-17) or the history and aggregate enrichment (P-18).

Functional requirements:
1. Shared zod schemas for each event_type payload (injury, skipped_exercise, medication_change, life_event, state_update, plan_adjustment_request) as a discriminated union.
2. chat.send({ message }), requiring use_chat and limited to 2000 characters. Assemble the context fresh: profile, onboarding submissions, the most recent 50 profile events plus a compact summary of older ones, and today's plan. Call the AI module with the chat purpose and the schema { reply, facts[], adjustment? }, persist each fact with an optional source_message excerpt of at most 200 characters, and return { reply, factsSaved, adjustment? }. Store nothing else, and never store the reply.
3. An AI failure throws TRPCError INTERNAL_SERVER_ERROR with "AI is temporarily unavailable" and persists nothing.
4. Chat panel in the (member) layout: a floating panel, messages kept only in component state, typing indicator, retryable error toast, mobile friendly.

Acceptance criteria:
- A message reporting an injury and a medication change stores two facts of the right types.
- A second message sees the facts from the first in its context.
- The schema contains no conversation, session, or message table.

Tests:
- Vitest against the test database with the AI mock, plus a unit test of the context builder. Run only the chat tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
