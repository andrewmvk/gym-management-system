Task: implement and test business rule RN-04 in isolation (exercise availability based on linked
equipment).

Context:
- Rule (docs/06-business-rules.md, RN-04): an exercise is eligible if it needs no equipment at
  all OR at least one of its linked equipment items is currently available.
- This function should already exist as part of the catalog module (see
  prompts/P-02-catalog-backend.md); this task is about making sure it's pure and fully covered by
  tests, not about creating the whole module again.

Permitted scope:
- Only change the isExerciseAvailable function (or equivalent) in
  apps/api/src/modules/catalog/service.ts and its corresponding test file.
- Don't change the schema, router, repository, or frontend.
- Don't add new dependencies.

Acceptance criteria:
- The function is pure: it receives the list of equipment already linked to the exercise (with
  their is_available) as a parameter, with no query inside it.
- No equipment needed (empty list) → always true.
- One linked equipment item, available → true.
- One linked equipment item, unavailable → false.
- Multiple equipment items, at least one available → true.
- Multiple equipment items, all unavailable → false.

Tests:
- Vitest covering exactly the five cases above.
- Run only this function's test file.

Final response:
- Respond in at most 8 lines with the file changed, tests run, and pending items.
