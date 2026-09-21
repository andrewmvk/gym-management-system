Blocked by: P-02
Covers: FR-44, NFR-1, NFR-3
MVP: 1
Artifacts: packages/shared/src/auth/abilities.ts (+ test), apps/api/src/modules/auth/, apps/api/src/trpc/{context.ts, procedures.ts}, apps/web/src/{lib/trpc.ts, abilities.tsx, components/auth-guard.tsx}, apps/web/src/app/login/page.tsx, layouts for the (member), (staff) and kiosk route groups
Evidence: Vitest: expired grants excluded, denied beats granted, self scope, member gate, login success and failure, cookie flags, expired token, forbidden for a member-only user; manual: the seeded admin logs in, lands in the staff area, and cannot open member routes

Task: implement the CASL ability builder, login and session, the tRPC context, and the guarded route groups on the frontend.

Context:
- docs/04-architecture.md §3 and §11, rules/backend.md "Authorization (CASL)", rules/frontend.md ("Routing / access structure", "Authorization (CASL)"), rules/error-handling.md, and rule RN-10 in docs/06-business-rules.md (effective permission is the union of non-expired grants; a denied row always wins).
- The JWT carries only { userId }. Permissions are resolved from the database on every request. There is no role field, no role-based procedure builder, and no inline role check.
- The vocabulary and the policy catalog already exist in packages/shared/src/auth (P-02).

Permitted scope:
- Only the files in Artifacts plus registering the auth router in the app router.
- Allowed new dependencies: @casl/ability, @casl/react, jsonwebtoken (and its types). Justify them.
- Don't build the set-password flow or any feature screen.

Functional requirements:
1. abilities.ts: defineAbilityFor(user, grants) keeps only grants whose expires_on is null or in the future, maps each to a CASL rule (condition { userId: user.id } for scope self, inverted rule for denied), and is used identically by both apps.
2. auth.login(email, password): bcrypt compare; a user without password_hash cannot log in; wrong password and unknown e-mail return the same generic error. On success sign the JWT with JWT_SECRET and set the cookie httpOnly, sameSite=lax, Secure only when NODE_ENV is production, 7 day lifetime. auth.logout clears it. auth.me returns the user (never the hash) with membership fields and the serialized ability rules.
3. context.ts verifies the JWT once per request, loads the active grants, builds the ability, and attaches ctx.user and ctx.ability. procedures.ts exports publicProcedure, authedProcedure (UNAUTHORIZED without a user) and an assertCan helper that throws FORBIDDEN.
4. Frontend: tRPC client with the React Query provider sending credentials; a login page (react-hook-form, zodResolver, sonner toasts); AbilityContext, a Can component and an AuthGuard that builds the ability once per session; layouts for (member) (needs read_member_app), (staff) (needs read_staff_app) and kiosk (no user auth). Unauthenticated users go to /login; a signed-in user without a group's ability is redirected to the group they may use. Each group has its own error.tsx. Responsive from phone width up.

Acceptance criteria:
- The ability rules in criterion 1 hold for expired, denied, self-scoped, and multi-policy cases.
- Cookie flags are correct in development and in production mode; a tampered or expired token behaves as unauthenticated.
- A member-only user gets FORBIDDEN on a procedure that asserts a staff ability.
- Every data-fetching component handles loading and error states.

Tests:
- Vitest for the ability builder (pure) and for the auth procedures against the test database. No component tests (rules/testing.md); validate the screens manually with npm run dev and the seeded accounts.

Final response:
- Respond in at most 10 lines with files created, tests run, manual steps, and pending items.
