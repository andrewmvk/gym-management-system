# Traceability Matrix

Unit 2 §7: the matrix links **requirement → prompt → generated artifact → test/evidence**. Fill in one
row per prompt executed, in the order they were sent. This is what proves, to the instructor (and to
you in six months), that every piece of code was born from a traceable requirement — not from an
agent's assumption.

| Requirement | Associated prompt | Generated artifact | Test/evidence |
|---|---|---|---|
| FR-16, FR-17, FR-24 | [P-01](../prompts/P-01-catalog-data-model.md) — catalog schema | `apps/api/src/db/schema/catalog.ts` + migration | `drizzle-kit generate` runs with no error; columns match `docs/05-data-model.md` |
| FR-16, FR-17, FR-24 | [P-02](../prompts/P-02-catalog-backend.md) — catalog tRPC procedures | `apps/api/src/modules/catalog/{router,service,repository}.ts` | Unit test of the availability predicate covering RN-04's 4 cases |
| FR-16, FR-17, FR-24 | [P-03](../prompts/P-03-catalog-frontend.md) — catalog screen (staff) | `apps/web/src/app/(staff)/catalog/**` | Manual navigation via `docker compose up`; equipment toggle reflects in the database |
| RN-04 | [P-04](../prompts/P-04-rn04-availability-tests.md) — isolated availability rule | `isExerciseAvailable()` in `catalog/service.ts` | Vitest: 0 linked equipment, 1 available, 1 unavailable, multiple mixed |
| _(next row)_ | | | |

## How to fill in a new row

1. Pick an FR/RN that doesn't yet have an associated prompt (start with the current MVP in `docs/07-mvp-roadmap.md`).
2. Write the prompt in the format of `prompts/_template.md` and save it as `prompts/P-<nn>-<slug>.md`.
3. Send the prompt (paste it here in the conversation, or hand it to Codex).
4. After the agent responds, fill in "Generated artifact" with the files it actually touched
   (check the diff — don't just trust the agent's text response, that's the **auditor** part).
5. Run the described test/evidence and only mark it as done if it actually passes.
