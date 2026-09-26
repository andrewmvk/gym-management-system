Blocked by: [P-xx, P-yy | none]
Fixes: [P-xx | none - only when this prompt corrects an already-executed prompt]
Covers: [FR-xx, RN-xx]
MVP: [1-5]
Artifacts: [main files or folders this prompt creates or changes]
Evidence: [the test or manual check that proves the prompt was fulfilled]

Task: implement [specific feature/rule, citing the FR/RN].

Context:
- The system has [describe only the modules relevant to this task].
- The feature belongs to the [module name in apps/api or apps/web] module.
- [Any business rule (RN) this task must honor, cited by its RN-xx code].

Permitted scope:
- Only change [exact files/folders].
- Don't change [layers, Docker, auth, database, frontend, etc. when not part of this task].
- Don't add new dependencies without justifying and asking for approval first.

Functional requirements:
1. [requirement]
2. [requirement]

Acceptance criteria:
- [verifiable condition]
- [verifiable condition]

Tests:
- Create or adjust only tests related to this feature/rule.
- Run only the related tests.

Final response:
- Respond in at most 10 lines with files changed, tests run, and pending items.
