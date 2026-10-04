Blocked by: P-01
Covers: shared base for every AI feature (plan and chat; the AI purposes are only these two since P-31), RN-01
MVP: 2
Artifacts: apps/api/src/modules/ai/ (client, structured runner, mock fixtures, index), env additions (AI_MODE)
Evidence: Vitest with a mocked fetch: 200 ok, a fenced JSON answer, 429 / 500 / network error / malformed envelope (unavailable, no retry), timeout, invalid JSON twice, invalid then valid, the key and prompts never appear in logs; mock mode makes no network call and returns the plan and chat fixtures (a fixture that does not match the caller schema gives invalid_output)
Status: Partly superseded by P-31 (audit-log item 20): the aptitude and certificate purposes, their verdict schema and the AI_MOCK_APTITUDE / AI_MOCK_CERTIFICATE switches are removed. The code and its tests still carry them until P-31 is executed

Task: implement the single OpenRouter wrapper that every AI call in the system goes through.

Context:
- rules/backend.md "AI integration" and rules/error-handling.md "AI call sites". No domain service may call OpenRouter directly.
- The model id comes from OPENROUTER_MODEL and is never hardcoded. Environment variables are listed in docs/04-architecture.md §9.
- The module is text only: a call carries a system string and a user string and nothing else, so the AI never receives an image or a file (a reference photo, an attached exam). What the AI reads of a member's exams is the findings the member typed.
- Callers turn a technical failure into their own state: plan and chat generation fails with a retryable "AI is temporarily unavailable" error and saves nothing, never a made-up result (RN-01). This module only reports it.

Permitted scope:
- Only files under apps/api/src/modules/ai/ and the new env var AI_MODE in the env loader and .env.example (the plan generator switch PLAN_GENERATOR belongs to P-13). OPENROUTER_API_KEY and OPENROUTER_MODEL are already in the loader as optional (P-01); make them required unless AI_MODE is mock.
- Use the global fetch. No new dependencies.

Functional requirements:
1. runStructured({ purpose, system, user, schema }) where purpose is plan | chat and schema is a zod type. It returns { ok: true, data } or { ok: false, reason: "unavailable" | "invalid_output" } and never throws for timeouts, 429, other non-2xx responses, network errors, or malformed JSON.
2. Ask for JSON output, validate it against the schema (a fenced JSON answer is accepted), and time out after 30 seconds (a named constant). On a parse or validation failure retry exactly once, then return invalid_output. A transport failure is reported at once, without a retry.
3. AI_MODE=mock skips the network and returns deterministic fixtures per purpose: plan returns an empty exercise list (plan generation then falls back to its deterministic placeholder, P-13) and chat returns a canned reply with no facts. There are no per-purpose mock switches.
4. Log failures at warn level with the purpose and reason only. Never log prompts, member data, or the API key.

Acceptance criteria:
- Every failure mode returns the documented result without throwing.
- The retry happens once and only on invalid output.
- Mock mode makes zero network calls.
- There is no purpose other than plan and chat, and no way to send a file or an image through the module.

Tests:
- Vitest with a mocked fetch for each failure mode and the mock fixtures. Run only this module's tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
