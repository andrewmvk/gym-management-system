Blocked by: P-03, P-08
Covers: FR-9
MVP: 2
Artifacts: auth.setPassword in apps/api/src/modules/auth/, a member-activated hook, the set-password step in apps/web/src/app/signup/
Evidence: Vitest against Postgres: a cleared applicant sets a password, receives the member policies and a session cookie; pending and rejected applicants are refused; a second call is refused

Task: implement the moment an applicant who is cleared sets a password and becomes a member.

Context:
- FR-9 in docs/02-requirements.md and rule RN-03 in docs/06-business-rules.md: a member with a final rejection never receives a password or authenticated access. Authentication only exists after clearance.
- The session cookie, ability building, and policy constants come from P-02 and P-03. The MEMBER_POLICY_IDS group lists what a new member receives.

Permitted scope:
- Only the files in Artifacts. No new dependencies.
- Don't build onboarding or e-mail sending.

Functional requirements:
1. Public procedure auth.setPassword({ userId, password }): allowed only when aptitude_status is cleared and password_hash is null. Rejected or still pending applicants get a specific error. The password needs at least 8 characters and is hashed with bcrypt.
2. On success grant every MEMBER_POLICY_IDS policy indefinitely, set membership_status to active and membership_plan to a default mock label (FR-40 is mocked), start the session exactly like auth.login, and return the next step "onboarding".
3. Expose a small in-process hook, onMemberActivated(userId), that later prompts subscribe to (the invite e-mail in P-12). A failing subscriber never breaks activation.
4. Frontend password step: a form with confirmation and a clear error for a refused state, then redirect to /onboarding.

Acceptance criteria:
- After activation the user has the member policies, no staff policy, and a working session.
- A second call, a rejected applicant, and a pending applicant are all refused.

Tests:
- Vitest against the test database for the criteria above. Run only these tests.

Final response:
- Respond in at most 8 lines with files created, tests run, and pending items.
