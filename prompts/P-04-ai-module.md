Blocked by: P-01
Covers: shared base for every AI feature (aptitude, certificate, plan, chat)
MVP: 2
Artifacts: apps/api/src/modules/ai/ (client, structured runner, mock fixtures, index), env additions
Evidence: Vitest with a mocked fetch: 200 ok, 429, timeout, invalid JSON twice, invalid then valid; the API key never appears in logs; mock mode makes no network call

Task: implement the single OpenRouter wrapper that every AI call in the system goes through.

Context:
- rules/backend.md "AI integration" and rules/error-handling.md "AI call sites". No domain service may call OpenRouter directly.
- The model id comes from OPENROUTER_MODEL and is never hardcoded. Environment variables are listed in docs/04-architecture.md §9.
- Callers turn a technical failure into their own state (pending_retry for aptitude and certificate, a retryable error for plan and chat). This module only reports it.

Permitted scope:
- Only files under apps/api/src/modules/ai/ and the new env vars (AI_MODE, AI_MOCK_APTITUDE, AI_MOCK_CERTIFICATE) in the env loader and .env.example.
- Use the global fetch. No new dependencies.

Functional requirements:
1. runStructured({ purpose, system, user, schema }) where purpose is aptitude | certificate | plan | chat and schema is a zod type. It returns { ok: true, data } or { ok: false, reason: "unavailable" | "invalid_output" } and never throws for timeouts, 429, other non-2xx responses, network errors, or malformed JSON.
2. Ask for JSON output, validate it against the schema, and time out after 30 seconds (a named constant). On a parse or validation failure retry exactly once, then return invalid_output.
3. AI_MODE=mock skips the network and returns deterministic fixtures per purpose. AI_MOCK_APTITUDE and AI_MOCK_CERTIFICATE accept cleared | not_cleared | unavailable so each signup path can be exercised by hand.
4. Log failures at warn level with the purpose and reason only. Never log prompts, member data, or the API key.

Acceptance criteria:
- Every failure mode returns the documented result without throwing.
- The retry happens once and only on invalid output.
- Mock mode makes zero network calls.

Tests:
- Vitest with a mocked fetch for each failure mode and each mock switch. Run only this module's tests.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
