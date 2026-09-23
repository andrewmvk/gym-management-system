Blocked by: P-03
Covers: FR-43
MVP: 4
Artifacts: apps/api/src/modules/policies/{router,service,repository}.ts, apps/web/src/app/(staff)/policies/
Evidence: Vitest against Postgres: grant, revoke and extend change the effective ability as expected (RN-10), no procedure creates a user (RN-11), a non-admin is refused; manual: an admin grants and revokes a policy from the screen

Task: implement the admin policy management: view every policy and every user's grants, and grant, revoke, or extend them.

Context:
- FR-43 in docs/02-requirements.md, the policy flow in docs/03-features-and-flows.md (flow 9), docs/05-data-model.md, rules/database.md (revoking updates expires_on in place; policies are never deleted once referenced), and rules RN-10 and RN-11 in docs/06-business-rules.md.
- This feature only changes what an existing account can do. It never creates an account, so the "no staff self-signup" boundary of FR-41 still holds.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.

Functional requirements:
1. Procedures guarded by manage_policy_assignments: policies.list (every d_user_policy row, and every user with their grants including effect, expiry, and whether each is currently active), policies.grant({ userId, policyId, effect?, expiresOn? }) as an upsert on the composite key, policies.revoke({ userId, policyId }) setting expires_on to now, and policies.extend({ userId, policyId, expiresOn | null }) where null means indefinite.
2. No procedure deletes a policy or a grant row, and none inserts into d_users.
3. Staff page (staff)/policies: a policy definitions table (operation, resource, scope) and a users table with their grants, plus grant, revoke and extend dialogs with confirmation. Explicit loading, error and empty states.

Acceptance criteria:
- After grant, revoke, extend, and a denied override, defineAbilityFor gives the expected result for that user.
- A non-admin gets FORBIDDEN on every procedure.

Tests:
- Vitest against the test database, checking the effective ability through defineAbilityFor. The page is validated manually.

Final response:
- Respond in at most 8 lines with files created, tests run, and pending items.
