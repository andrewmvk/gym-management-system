Blocked by: P-03, P-09
Covers: FR-43, FR-47, FR-48
MVP: 4
Artifacts: apps/api/src/modules/policies/{router,service,repository}.ts, apps/api/src/db/schema/policies.ts (the three group tables), a generated migration in apps/api/drizzle/, apps/api/src/db/seed.ts (groups, group policy lists, staff group membership), apps/api/src/modules/auth/{repository,service}.ts (effective grants include groups; activation assigns the member group), packages/shared/src/auth/{constants/policies.ts, abilities.ts} and packages/shared/src/schemas/policies.ts, apps/web/src/app/(staff)/policies/, apps/web/src/lib/navigation.ts
Evidence: Vitest against Postgres: grant, revoke and extend change the effective ability as expected (RN-10), group assignment, revocation, expiry and a direct denied override over a group-supplied policy behave as RN-10 says, an admin cannot remove their own staff or policy-management access directly or through a group (RN-13), no procedure creates a user (RN-11) or edits a group (RN-13), a non-admin is refused; manual: an admin sees each user's groups at a glance, assigns and revokes a group and an individual policy, and filters the list by group and by policy

Task: implement the admin policy management: view every policy, every policy group and every user's groups and grants, assign, revoke or extend groups and individual policies, and filter users by group and policy.

Context:
- FR-43, FR-47 and FR-48 in docs/02-requirements.md, the policy flow in docs/03-features-and-flows.md (flow 9), docs/05-data-model.md (d_user_policy_group, d_user_policy_group_policy, f_user_policy_group_on_user), rules/database.md (revoking updates expires_on in place; policies and groups are never deleted once referenced), rules RN-10, RN-11 and RN-13 in docs/06-business-rules.md, and docs/09-audit-log.md finding 17 (why groups are live membership and not a copy of the policies).
- This feature only changes what an existing account can do. It never creates an account, so the "no staff self-signup" boundary of FR-41 still holds.
- A group is the source of truth with live membership: belonging to it has exactly the effect of holding each of its policies as `granted`, for as long as the membership is active. Groups are seeded and read-only: no procedure creates, edits or deletes one.
- P-02 seeded the staff accounts with direct policy rows and P-09 grants the member policies directly. This prompt replaces both with group membership, so the application no longer writes a per-user copy of a group's policies.

Permitted scope:
- Only the files in Artifacts and the router registration. No new dependencies.
- The schema change goes through `pnpm db:generate`. The seed stays idempotent and insert-if-missing for accounts and memberships (it must not undo a later group or policy change); a local database created before this prompt keeps its direct staff rows, which stay valid, or can be rebuilt with `pnpm db:reset`.

Functional requirements:
1. Schema: d_user_policy_group (text slug id, a short description, created_at), d_user_policy_group_policy (composite key group_id and policy_id, both foreign keys), f_user_policy_group_on_user (composite key user_id and group_id, foreign keys, nullable expires_on), exactly as in docs/05-data-model.md. No delete helper for any of them.
2. Shared: constants for the group ids (`member`, `trainer`, `admin`) and a group catalog (id, name, description, policy ids) built from the existing MEMBER_POLICY_IDS, TRAINER_POLICY_IDS and ADMIN_POLICY_IDS. The seed upserts the groups and re-asserts each group's policy list on every run, so a change in code reaches current members.
3. Effective permissions: findActiveGrants returns the union of the user's non-expired direct rows and every policy of each non-expired group membership (as `granted`), so defineAbilityFor, auth.me and every router keep working unchanged and a direct `denied` row still wins (RN-10). The seed gives the fixed trainer and admin their group instead of direct rows, and P-09's activation assigns the `member` group instead of granting each member policy.
4. Procedures guarded by manage_policy_assignments: policies.list (every d_user_policy row; every group with its policy ids; every user with their group memberships, their direct grants including effect and expiry, and for each effective policy its source, "via <group>" or "direct", and whether it is currently active), policies.grant({ userId, policyId, effect?, expiresOn? }) as an upsert on the composite key, policies.revoke({ userId, policyId }) setting expires_on to now, policies.extend({ userId, policyId, expiresOn | null }) where null means indefinite, and the group equivalents policies.assignGroup({ userId, groupId, expiresOn? }), policies.revokeGroup({ userId, groupId }) and policies.extendGroup({ userId, groupId, expiresOn | null }).
5. No procedure deletes a policy, a group or a grant or membership row, none edits a group or its policy list, and none inserts into d_users.
6. Self-lockout guard (RN-13): a change is refused with a clear BAD_REQUEST message, and rolled back, when, afterwards, the acting admin could no longer read StaffApp or manage UserPolicyAssignment. Compute it inside the same transaction from the effective ability the change produces, so it covers revoking or denying the policy directly and ending the group that supplies it, and still allows dropping a source that another one covers. A change to another user is never refused by it.
7. Staff page (staff)/policies: a Users tab where each user shows the groups they belong to as badge lines at a glance, each with its expiry, extend and remove actions (and "You" on your own row), their exceptions at full weight (denied, expired, expiring within 7 days) and their other effective policies collapsed, each labeled "via <group>" or "direct"; a Policies tab with a policies-by-groups matrix (one row per policy showing its description and permission, one column per group with its policy count and a help tooltip carrying its description, a tick where the group includes the policy, rows clustered by the groups that hold them), read-only; a filter by group and a filter by policy on the Users tab, kept in the URL (rules/frontend.md); and assign, revoke and extend dialogs with confirmation for groups and for individual policies, whose copy states the effect (including that revoking a denied row restores access, and that a group-supplied policy is taken away with a direct denied grant). Skeleton loading (a per-page skeleton inside GuardedContent, built from components' .Skeleton; rules/frontend.md "Loading states"), explicit error and empty states.

Acceptance criteria:
- After grant, revoke, extend, a denied override, and group assignment, group revocation and an expired membership, defineAbilityFor gives the expected result for that user.
- Denying directly a policy a user holds only through a group removes it from their ability; the other policies of the group stay.
- Changing a group's policy list in the seed reaches the next ability built for an existing member.
- An admin cannot revoke, deny or expire their own manage_policy_assignments or read_staff_app, directly or by ending the only group that supplies it, and can still change another admin's.
- A non-admin gets FORBIDDEN on every procedure.

Tests:
- Vitest against the test database, checking the effective ability through defineAbilityFor, plus the seed idempotency for groups and the activation test of P-09 updated to expect the member group. The page is validated manually.

Final response:
- Respond in at most 8 lines with files created, tests run, and pending items.
