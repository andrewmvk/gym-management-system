Blocked by: P-14, P-20
Covers: FR-36, FR-40, FR-60 (the staff Member page), RN-15
MVP: 4
Artifacts: apps/api/src/modules/metrics/{router,service,repository}.ts (new domain module), packages/shared/src/schemas/metrics.ts, member listing and the membership lockout in apps/api/src/modules/auth/{router,service}.ts (listMembers, verifyCredentials, loadSession), apps/api/src/modules/members/{router,service,repository}.ts (new domain module: members.get and members.setMembershipStatus, + router test), apps/web/src/app/(member)/metrics/, apps/web/src/app/(staff)/members/{page,members-table,membership-control,membership-badge}.tsx and apps/web/src/app/(staff)/members/[id]/ (the staff Member page), apps/web/src/components/{date-range-picker,calendar,app-header,membership-badge,help-tip}.tsx, apps/web/src/lib/navigation.ts
Evidence: Vitest against Postgres: for a known data set the metrics are exact, days trained ignore days with only completed exercises and no check-in, and a retroactive correction is reflected; a correct password for an inactive member is refused with the front-desk message and sets no cookie while a wrong password keeps the generic error, an existing session stops working, the member signs in again once reactivated, and staff are never affected (auth router tests); an admin switches a membership off and on idempotently, a trainer, a member and a signed-out visitor are refused, and a staff account or an unknown user cannot be switched (members router tests); members.get gives a trainer the profile, membership, current health profile, remembered facts (resolved ones kept), plans (the last 60 days and any later one, with done and note counts) and the last 30 distinct check-in days, with no embedding, photo path, password or exam file path, and answers not found for a staff account or an unknown id; a trainer lists the members through auth.listMembers; manual: the metrics page, the Members table with its control, and the Member page render. Not yet done in a browser: the Members table links, the membership control and its confirmation, and the Member page
Status: Partly superseded by P-31 (audit-log item 20): the Members table and the Member page no longer show or depend on an aptitude status (`aptitude_status` is removed), and an applicant no longer exists as a row. The code and its tests still carry them until P-31 is executed

Task: implement the member's personal metrics, the mocked membership status with its effects, and the staff Member page.

Context:
- FR-36, FR-40 and FR-60 in docs/02-requirements.md and the metrics section of docs/05-data-model.md. "Days trained" and training frequency count distinct local calendar days with at least one f_check_ins row, and only that. Exercise breakdown, volume and goal progress come from the plan tables and reflect retroactive corrections (RN-07).
- Membership status is a mocked field on d_users with no billing behind it (`active` or `inactive`). `inactive` has two effects (RN-15): the member cannot log in, and cannot check in at the kiosk (P-20). The scenario: a member stops paying, comes back months later, pays at the front desk, and a staff member reactivates them.
- The metrics and members modules are new: add "metrics" and "members" to the domain list in rules/backend.md and tell the developer, per AGENTS.md "Keeping docs in sync".
- Local-day logic reuses lib/dates.ts (P-14). Check-ins come from P-20.

Permitted scope:
- Only the files in Artifacts and the router registrations. No new dependencies.
- The seed's demo member (student@example.com, from the P-02 seed) is the account to check the member pages with.

Functional requirements:
1. metrics.mine({ from, to }), requiring read_own_metrics: trainingFrequency (check-in days per week), daysTrained, exerciseBreakdown (completed exercises per exercise, and the muscle load of the completed exercises since P-29 replaced the per-muscle-group count), trainingVolume (sum of sets times reps for completed exercises), and goalProgress (share of planned exercises completed plus the member's goals text). Everything is computed by queries, nothing is stored.
2. auth.listMembers guarded by read_members (admins and trainers): each registered member (an account with a membership_status) with membership_status and membership_plan, never an embedding or a photo path. auth.me already returns the member's own membership fields (P-03).
3. Membership lockout (FR-40, RN-15): verifyCredentials refuses an inactive member with FORBIDDEN and the message "Your membership is inactive. Ask the front desk to reactivate it." only after a correct password, so the message cannot be used to learn which emails exist (a wrong password keeps the generic error); loadSession returns no session for an inactive member, so a cookie issued before the lapse stops working at once. Staff have no membership status and are never affected.
4. members.setMembershipStatus({ userId, status }) guarded by manage_memberships (update Member, admin group): the caller states the target value, so a repeated or stale click leaves the same state; a staff account or an unknown user is refused (BAD_REQUEST, NOT_FOUND). The result carries no embedding, photo path or password.
5. members.get({ userId }) guarded by read_members: profile (name, email, phone, birthdate, age, gender, member since), membership, the current health profile (the newest onboarding submission), every remembered fact with its resolved state, the plans of the last 60 days and any later one (date, status, exercise count, done count, notes count), and the last 30 distinct check-in days. It is not found for a staff account, so the page lists only members, like the table.
6. Pages: (member)/metrics with a single date range picker (a popover with presets for today, last 7 and 30 days, this month, last 3 and 6 months, this year and last 12 months, plus a calendar for a custom first and last day, built by adding range highlighting to the existing Calendar so no dependency is added), a summary strip, a breakdown table by exercise and a muscle heat map (P-29), the member's goals, and an empty state. Every figure says exactly what it counts, with a `?` tooltip: "Days trained" (days with a check-in), "Frequency" (days trained per week), "Reps completed" (sets times reps of the exercises ticked off, the load not counted), "Plan completed" (ticked exercises of the planned ones) and "Muscles worked" (weighted sets, not reps: a completed set counts once for a primary muscle and half for a supporting one).
7. Staff pages: (staff)/members, the searchable, filterable (All, Active, Inactive) membership table, whose member names link to /members/[id] and whose status cell is the membership control: an admin sees a switch (activating is one click, deactivating opens a confirmation that the member is signed out right away and cannot log in until reactivated, with plans and history kept), anyone else sees the status as a read-only badge. (staff)/members/[id] is the Member page: the name, email, phone, age and member-since line, the membership control, the current health profile, the remembered facts (those no longer true muted), the plans (each opens its review) and the last 30 days of check-ins, with skeleton, error, not-found and no-access states.
8. The member header shows a membership badge (and the account menu too): "Active" in the live style, and "Inactive" as a plain neutral badge, not struck through, because it is a fact about the account.

Acceptance criteria:
- Metrics match a hand-computed data set exactly.
- A day with completed exercises but no check-in does not count as trained.
- A member reads only their own metrics; a non-staff caller cannot list members or open a Member page.
- An inactive member cannot log in and an existing session of theirs is no session; after an admin sets the status back to active both work again.
- Only an admin can change a membership; a trainer sees the table and the Member page read-only.

Tests:
- Vitest against the test database with seeded rows. Pages are validated manually.

Final response:
- Respond in at most 10 lines with files created, tests run, and pending items.
