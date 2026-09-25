Blocked by: P-02
Covers: FR-44, NFR-1, NFR-3
MVP: 1
Artifacts: packages/shared/src/auth/abilities.ts (+ test), packages/shared/src/schemas/auth.ts, apps/api/src/modules/auth/{router,service,repository,session}.ts (+ router test), apps/api/src/trpc/{context.ts, procedures.ts}, apps/web/src/{abilities.tsx, lib/routes.ts}, apps/web/src/components/{auth-guard, guarded-content, app-header, logout-button, login-form, page-container, page-heading, page-message, route-error}.tsx, apps/web/src/app/login/page.tsx, layouts, error pages and a landing page for the (member) (/home), (staff) (/staff) and kiosk (/kiosk) route groups
Evidence: Vitest: expired grants excluded, denied beats granted, self scope, member gate, login success and failure, cookie flags, expired token, forbidden for a member-only user; manual: the seeded admin logs in, lands in the staff area, and cannot open member routes

Task: implement the CASL ability builder, login and session, the tRPC context, and the guarded route groups on the frontend.

Context:
- docs/04-architecture.md §3 and §11, rules/backend.md "Authorization (CASL)", rules/frontend.md ("Routing / access structure", "Authorization (CASL)", "Loading states"), rules/error-handling.md, and rule RN-10 in docs/06-business-rules.md (effective permission is the union of non-expired grants; a denied row always wins).
- The JWT carries only { userId }. Permissions are resolved from the database on every request. There is no role field, no role-based procedure builder, and no inline role check.
- The vocabulary and the policy catalog already exist in packages/shared/src/auth (P-02).

Permitted scope:
- Only the files in Artifacts plus registering the auth router in the app router. The login input schema lives in packages/shared so the form and the procedure validate with the same zod schema (rules/frontend.md "Forms").
- Allowed new dependencies: @casl/ability, @casl/react, jsonwebtoken (and its types), plus the shadcn/ui components the login form uses (input, label, card, field, skeleton). Justify them.
- Don't build the set-password flow or any feature screen.

Functional requirements:
1. abilities.ts: defineAbilityFor(user, grants, now?) keeps only grants whose expires_on is null or in the future, ignores any operation or resource outside the shared vocabulary, maps each to a CASL rule (condition { userId: user.id } for scope self, inverted rule for denied, denials ordered last so they always win), and is used identically by both apps. It also exports buildAbilityRules (the serializable rules) and createAppAbility(rules), which the frontend uses to rebuild the ability from auth.me.
2. auth.login(email, password): bcrypt compare (against a dummy hash when the e-mail is unknown, so both failures take the same time); a user without password_hash cannot log in; wrong password and unknown e-mail return the same generic UNAUTHORIZED error. On success sign the JWT ({ userId }, HS256) with JWT_SECRET and set the cadence_session cookie httpOnly, sameSite=lax, Secure only when NODE_ENV is production, 7 day lifetime. auth.logout clears it. auth.me is public and returns null without a valid session (a normal answer for the route guards, not an error), otherwise the user (never the hash, never biometric fields) with membership fields and the serialized ability rules.
3. context.ts verifies the JWT once per request, loads the active grants, builds the ability, and attaches ctx.session, ctx.user and ctx.ability (an empty ability when signed out); a tampered or expired token counts as signed out. procedures.ts exports publicProcedure, authedProcedure (UNAUTHORIZED without a user) and an assertCan helper that throws FORBIDDEN.
4. Frontend: tRPC client with the React Query provider sending credentials; a login page (react-hook-form with shadcn's Field components and Controller, zodResolver on the shared schema, sonner toasts; a signed-in visitor goes straight to their area). @casl/react 7 has no createContextualCan, so abilities.tsx re-exports AbilityProvider and exposes a typed Can and useAppAbility. The (member) (needs read_member_app, lands on /home) and (staff) (needs read_staff_app, lands on /staff) layouts render the shared AppHeader outside the AuthGuard, so it never flickers. AuthGuard builds the ability once per session and only reports whether the session is ready; each page wraps its content in GuardedContent with its own per-page skeleton built from components' `.Skeleton`s (rules/frontend.md "Loading states"), so page queries never run before the session is confirmed. kiosk has no user auth. Unauthenticated users go to /login?next=<path>; a signed-in user without a group's ability is redirected to the group they may use. Each group has its own error.tsx. Responsive from phone width up.

Acceptance criteria:
- The ability rules in criterion 1 hold for expired, denied, self-scoped, and multi-policy cases.
- Cookie flags are correct in development and in production mode; a tampered or expired token behaves as unauthenticated.
- A member-only user gets FORBIDDEN on a procedure that asserts a staff ability.
- Every data-fetching component handles loading (per-element skeletons, never one big block) and error states.

Tests:
- Vitest for the ability builder (pure) and for the auth procedures against the test database. No component tests (rules/testing.md); validate the screens manually with pnpm dev and the seeded accounts (admin@example.com and trainer@example.com, passwords from .env).

Final response:
- Respond in at most 10 lines with files created, tests run, manual steps, and pending items.
