# Error Handling

## Domain "failure" is data, not an exception

`pending_retry`, a rejected face-match, and a `turnstile_status: 'failed'` check-in are all **expected outcomes**, not errors to throw and catch. Model them as the enum/status columns `docs/05-data-model.md` already defines, and let the request complete normally with that status. Never:

- let an AI timeout bubble up as an unhandled `500` on the aptitude/certificate procedures — catch it and write `ai_result = 'pending_retry'`.
- treat "ambiguous top-two face match" as a caught exception — it's a normal branch in the matching logic that returns "no match, retry."
- let a failed turnstile REST call prevent the check-in row from being written — it always writes, tagged `turnstile_status: 'failed'`.

This is principle 4 from `PRODUCT.md`: distinguish technical failure from a real determination, always as its own explicit state.

## Real exceptions

Use zod for every tRPC procedure input; a validation failure is handled automatically by tRPC as `BAD_REQUEST` — don't hand-write input checks that duplicate the schema. For everything else, throw `TRPCError` with the specific code that applies (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`). There is no custom domain error class hierarchy in this project — don't introduce one; if a failure needs a name, it's a status column, not a thrown type.

## AI call sites

Every OpenRouter call (aptitude eval, certificate review, plan generation, chat) goes through the shared AI module (`rules/backend.md`). On a request-level failure (timeout, rate-limit, network error) or a structured-output parse failure after one retry:

- **Aptitude/certificate evaluation** → resolve to `pending_retry`, return normally.
- **Plan generation/chat** → throw `TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' })`; the frontend shows this as a retryable toast, not a crash.

## Frontend

- Recoverable/expected errors (AI unavailable, face-match rejected, form validation) → `sonner` toast with an actionable message ("Try again").
- Unexpected render/query errors → route-level `error.tsx` boundary (Next.js App Router), one per route segment where a distinct fallback is useful (member app vs kiosk vs staff).
- Every data-fetching component handles the React Query error state explicitly — no silent `undefined` rendering while an error is in flight.

## Logging

- `pino` on the backend, structured (`requestId`, `userId`, `route`).
- `warn` level: expected-but-notable failures (AI call failed → `pending_retry`, turnstile call failed, face-match rejected).
- `error` level: anything unexpected (unhandled exception, DB error).
- Never log raw biometric data (embeddings, photo paths' contents), password hashes, or full JWTs — log ids, not payloads.
