Blocked by: P-04, P-11, P-13
Covers: FR-25, FR-26, FR-27, FR-58, and the rewording of FR-25, FR-27 and FR-28 (the remembered facts are visible and correctable)
MVP: 3
Artifacts: packages/shared/src/schemas/profile-events.ts, packages/shared/src/auth/constants/policies.ts (the member policy manage_own_profile_events), apps/api/src/modules/chat/{router,service,repository}.ts, apps/api/src/modules/profile/{router,service,repository}.ts (listMine, setResolved), the resolved_at column of f_profile_events (P-13), chat panel in apps/web/src/app/(member)/chat-panel.tsx, the remembered facts list in apps/web/src/app/(member)/onboarding/remembered-facts.tsx
Evidence: Vitest with the AI mock: facts are persisted with the right event types, chat.send returns the saved facts, an AI failure stores nothing and returns the retryable error, the context builder includes earlier facts, leaves out a resolved fact, and never folds an injury or a medication change into the older-events count (an old injury outside the 50-event window stays in the detailed block); profile.listMine returns only the member's own facts newest first and profile.setResolved marks and clears a fact, refuses another member's fact and a staff account without the policy; manual (not yet done in a browser): the chat dialog (focus trap, Escape closes) forgets its messages on reload and shows Remembered facts after a reply, and the Health profile list marks a fact "No longer true" and "Applies again"

Task: implement the AI chat that reads the member's full history, replies, and turns each message into durable structured facts that the member can see and correct.

Context:
- FR-25 to FR-27 and FR-58 in docs/02-requirements.md, docs/04-architecture.md §4, and f_profile_events in docs/05-data-model.md (created empty in P-13, with a nullable resolved_at). Principle 2 in AGENTS.md: future plans reason from the accumulated facts, never from a raw transcript.
- There is no server-side conversation or session object and no persisted chat log. The UI keeps messages only in component state (FR-26). Durability lives entirely in f_profile_events.
- The facts are the system's memory, so they must be visible and correctable by the member (FR-58): a fact the member marks "no longer true" stays as history but is skipped by every plan and chat prompt. Injuries and medication changes are always given to the AI in detail, however old, and never summarized into a count.
- The member policy manage_own_profile_events (manage ProfileEvent, scope self) lets a member read and resolve only their own facts.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.
- Don't build plan adjustment (P-17) or the history and aggregate enrichment (P-18).

Functional requirements:
1. Shared zod schemas for each event_type payload (injury, skipped_exercise, medication_change, life_event, state_update, plan_adjustment_request) as a discriminated union, plus a label and a one-line description per type. P-29 adds muscle_focus_changed, which is bookkeeping and is never shown as a remembered fact.
2. chat.send({ message }), requiring use_chat and limited to 2000 characters. Assemble the context fresh: profile, onboarding submissions (newest is the current truth), the unresolved profile events (the most recent 50, plus the injuries and medication changes of any age in detail, plus a compact summary of the other older ones), and today's plan. Call the AI module with the chat purpose and the schema { reply, facts[], adjustment? }, persist each fact with an optional source_message excerpt of at most 200 characters, and return { reply, factsSaved, facts, adjustment? } where facts lists each saved fact's type and one-line summary. Store nothing else, and never store the reply.
3. An AI failure throws TRPCError INTERNAL_SERVER_ERROR with "AI is temporarily unavailable" and persists nothing.
4. profile.listMine returns the member's facts newest first (with resolved_at, without muscle focus changes) and profile.setResolved({ id, resolved }) sets or clears resolved_at on the member's own fact only (another member's id is not found).
5. Chat panel in the (member) layout: a floating button that opens a modal dialog (focus trap, Escape closes, mobile friendly) with messages kept only in component state, a typing indicator, a retryable error toast, and, under each reply that saved facts, the "Remembered" facts with a link to the Health profile page.
6. Health profile page: a "What your coach remembers" list of every fact grouped by type, with its date and the member's own words, a "No longer true" action (and "Applies again" for a resolved one), resolved facts shown apart and muted. The page and the current profile above it are P-11's.

Acceptance criteria:
- A message reporting an injury and a medication change stores two facts of the right types, and the reply lists both.
- A second message sees the facts from the first in its context.
- A fact marked no longer true is absent from the next chat and plan prompt; an unresolved injury stays in the detailed block however old.
- A member cannot read or resolve another member's fact.
- The schema contains no conversation, session, or message table.

Tests:
- Vitest against the test database with the AI mock, plus a unit test of the context builder. Run only the chat and profile tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
