Blocked by: P-15, P-16
Covers: FR-21, FR-23, and the rewording of FR-21 and FR-22 (the instruction reaches the regeneration; two confirmation reasons)
MVP: 3
Artifacts: chat.adjustPlan in apps/api/src/modules/chat/, the adjustment and confirmation UI in the chat panel (apps/web/src/app/(member)/chat-panel.tsx and plan/plan-overwrite-dialog.tsx)
Evidence: Vitest against Postgres: a correction on a past date overwrites that date's rows in place (RN-07), drops a corrected exercise that is not currently available, and asks for confirmation first when a trainer edited the plan; a future or today date regenerates, passes the member's instruction and the other members' demand into the prompt, and asks for confirmation first when a trainer edited the plan (reason trainer_edited) or when the member already ticked an exercise (reason has_completed) (RN-06); an AI failure changes nothing; an invalid date is rejected; manual (not yet done in a browser): the Apply button and the confirmation dialog for both reasons

Task: let the member adjust a plan for any date through the chat, including retroactive corrections.

Context:
- FR-21 and FR-23 in docs/02-requirements.md, the chat and correction flow in docs/03-features-and-flows.md (flow 4), and rules RN-06, RN-07 and RN-16 in docs/06-business-rules.md.
- A retroactive correction directly overwrites that date's plan and exercise rows. It is not versioned or append-only, and metrics always read the corrected version.
- For today or a later date the member's instruction is passed into the regeneration (P-13), which also gives the AI the other members' demand for that date, and a regeneration never silently drops the ticks of exercises that stay (RN-16).
- The regeneration guard comes from P-15; the chat context and the adjustment field come from P-16.

Permitted scope:
- Only the files in Artifacts. No new dependencies.

Functional requirements:
1. chat.adjustPlan({ date, instruction, confirmOverwrite? }). For today or a future date, regenerate through plansService.generateForDate with the member's instruction added to the prompt. For a past date, ask the AI (chat purpose) for the corrections and apply them directly to the existing rows (completed flags, replaced or removed exercises), keeping the same plan row.
2. When the target plan needs confirmation and confirmOverwrite is not true, return { status: "needs_confirmation", reason, editedBy, editedAt, completedCount } as data. The reason is trainer_edited when a trainer edited the plan, or has_completed when the member already ticked exercises (a trainer edit comes first when both apply). A regeneration (today or later) checks both reasons; a retroactive correction checks only the trainer edit, because it states every tick explicitly.
3. UI: when chat.send returns an adjustment, show an "Apply to plan for <date>" button with the date formatted for reading. On needs_confirmation show a dialog that names the reason: "A trainer already adjusted this plan" (who edited it and when, and that applying replaces their edits) or "You've already started this plan" (how many exercises are ticked, and that the ticks on exercises that stay are kept), with a cancel and a confirm; confirm calls again with confirmOverwrite true.

Acceptance criteria:
- After a past-date correction the same plan row ids hold the new values and no history table exists.
- Regeneration and correction on a trainer-edited plan, and regeneration on a plan with ticked exercises, never proceed without confirmation.
- The member's instruction appears in the regeneration prompt for today or a later date.
- An invalid date is rejected by the input schema.

Tests:
- Vitest against the test database for the criteria above. The dialog is validated manually.

Final response:
- Respond in at most 10 lines with files changed, tests run, and pending items.
