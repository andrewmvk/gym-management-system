Blocked by: P-15, P-16
Covers: FR-21, FR-23
MVP: 3
Artifacts: chat.adjustPlan in apps/api/src/modules/chat/, the adjustment and confirmation UI in the chat panel
Evidence: Vitest against Postgres: a correction on a past date overwrites that date's rows in place (RN-07), a future date regenerates, and a trainer-edited plan asks for confirmation first (RN-06)

Task: let the member adjust a plan for any date through the chat, including retroactive corrections.

Context:
- FR-21 and FR-23 in docs/02-requirements.md, the chat and correction flow in docs/03-features-and-flows.md (flow 4), and rules RN-06 and RN-07 in docs/06-business-rules.md.
- A retroactive correction directly overwrites that date's plan and exercise rows. It is not versioned or append-only, and metrics always read the corrected version.
- The regeneration guard comes from P-15; the chat context and the adjustment field come from P-16.

Permitted scope:
- Only the files in Artifacts. No new dependencies.

Functional requirements:
1. chat.adjustPlan({ date, instruction, confirmOverwrite? }). For today or a future date, regenerate through plansService.regenerate. For a past date, ask the AI (chat purpose) for the corrections and apply them directly to the existing rows (completed flags, replaced or removed exercises), keeping the same plan row.
2. When the target plan is trainer_edited and confirmOverwrite is not true, return { status: "needs_confirmation", editedBy, editedAt } for both regeneration and retroactive correction.
3. UI: when chat.send returns an adjustment, show an "Apply to my plan for <date>" button. On needs_confirmation show a dialog "A trainer already adjusted this plan. Regenerating will replace their edits" with confirm and cancel; confirm calls again with confirmOverwrite true.

Acceptance criteria:
- After a past-date correction the same plan row ids hold the new values and no history table exists.
- Regeneration and correction on a trainer-edited plan never proceed without confirmation.
- An invalid date is rejected by the input schema.

Tests:
- Vitest against the test database for the criteria above. The dialog is validated manually.

Final response:
- Respond in at most 10 lines with files changed, tests run, and pending items.
