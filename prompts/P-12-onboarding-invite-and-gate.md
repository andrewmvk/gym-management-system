Blocked by: P-05, P-09, P-11
Covers: FR-10, FR-11
MVP: 2
Artifacts: apps/api/src/modules/onboarding/ (invite subscriber), the (member) layout redirect in apps/web
Evidence: Vitest: activating a member sends exactly one e-mail containing the onboarding link, and a failing e-mail provider does not break activation; manual: a member without an onboarding submission is redirected to /onboarding

Task: send the onboarding invite e-mail when a member is activated, and make the in-app onboarding page a guaranteed step.

Context:
- FR-10 and FR-11 in docs/02-requirements.md and docs/03-features-and-flows.md (flow 2). The onboarding page is also a normal in-app page, so a lost, misspelled, or spam-filtered e-mail is never a dead end.
- The activation hook comes from P-09, the e-mail adapter from P-05, and the onboarding status from P-11.

Permitted scope:
- Only the files in Artifacts. No new dependencies.

Functional requirements:
1. Subscribe to onMemberActivated and send an e-mail with a link to WEB_ORIGIN/onboarding through the e-mail adapter (WEB_ORIGIN already holds the web app URL for CORS; no new variable). A failure is logged at warn level and never blocks activation. In log mode the link appears in the API log, which is how the demo works without a provider account.
2. In the (member) layout, when onboarding.getStatus reports completed false, redirect every member route to /onboarding. The onboarding page itself and logout stay reachable.
3. The link works for a member who is not logged in: the (member) guard already sends them to /login?next=/onboarding and the login page returns them there afterward (P-03); keep that path working with the redirect above.

Acceptance criteria:
- Exactly one invite per activation, containing the link.
- A provider failure does not undo or block the password step.
- A member who has not onboarded cannot reach any other member page.

Tests:
- Vitest with the e-mail adapter mocked for the first two criteria. The redirect is validated manually.

Final response:
- Respond in at most 8 lines with files changed, tests run, and pending items.
