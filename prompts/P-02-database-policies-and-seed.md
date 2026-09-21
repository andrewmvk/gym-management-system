Blocked by: P-01
Covers: FR-41, FR-42
MVP: 1
Artifacts: apps/api/drizzle.config.ts, apps/api/src/db/{client.ts, schema/users.ts, schema/policies.ts, schema/index.ts, seed.ts}, generated migrations, packages/shared/src/auth/{types.ts, constants/policies.ts}
Evidence: Vitest against a real Postgres: migrations apply, a duplicate e-mail is rejected, the policy keys are enforced, and running the seed twice leaves the same row counts with no member policy on staff accounts

Task: set up Drizzle and PostgreSQL, create the users and policy tables, define the shared policy vocabulary, and write the idempotent seed for the policy catalog and the fixed trainer and admin accounts.

Context:
- Schema: docs/05-data-model.md (d_users, d_user_policy, f_user_policy_on_user). Conventions: rules/database.md and rules/naming-conventions.md. Migrations always come from drizzle-kit generate.
- Tests use a real Postgres through TEST_DATABASE_URL, never a mock (rules/testing.md).
- The seed is the only code path that creates staff accounts and their policies (FR-41) and must be safe to re-run.

Permitted scope:
- Only the files in Artifacts, a Vitest setup helper that migrates the test database, and the env additions (TEST_DATABASE_URL, SEED_TRAINER_PASSWORD, SEED_ADMIN_PASSWORD) in the env loader and .env.example.
- Allowed new dependencies: drizzle-orm, drizzle-kit (dev), pg, @types/pg, bcryptjs (pure JavaScript, installs cleanly on Windows and in Docker). Justify them in the final response.
- Don't create any other table, endpoint, or member data.

Functional requirements:
1. db/client.ts, drizzle.config.ts, and scripts db:generate, db:migrate, db:seed.
2. d_users exactly as in docs/05-data-model.md (enums aptitude_status and membership_status, unique e-mail). d_user_policy (text slug id, plain text operation, resource and scope). f_user_policy_on_user (composite primary key, foreign keys, effect enum, nullable expires_on). No delete helper for either.
3. schema/index.ts is the single re-export point, so later prompts add one line.
4. Shared vocabulary in packages/shared/src/auth: types.ts with Action (create, read, update, delete, manage), Subject (TrainingPlan, PlanReview, MedicalCertificate, Catalog, Onboarding, ProfileEvent, CheckIn, TurnstileConfig, GymInfo, Metrics, Member, UserPolicyAssignment, MemberApp, StaffApp) and Scope (self, all); constants/policies.ts with one constant per policy id and the catalog (id, description, operation, resource, scope) grouped as MEMBER_POLICY_IDS, TRAINER_POLICY_IDS and ADMIN_POLICY_IDS:
   - member: read_member_app (read MemberApp all), manage_own_onboarding (manage Onboarding self), read_own_plans (read TrainingPlan self), update_own_plans (update TrainingPlan self), use_chat (create ProfileEvent self), read_own_metrics (read Metrics self), read_catalog (read Catalog all), read_gym_info (read GymInfo all).
   - trainer: read_staff_app (read StaffApp all), read_all_plans (read TrainingPlan all), update_all_plans (update TrainingPlan all), manage_plan_reviews (manage PlanReview all), read_catalog, read_gym_info.
   - admin: read_staff_app, manage_catalog (manage Catalog all), review_certificates (manage MedicalCertificate all), manage_turnstile_config (manage TurnstileConfig all), manage_policy_assignments (manage UserPolicyAssignment all), read_members (read Member all), read_all_plans, read_checkins (read CheckIn all), read_catalog, read_gym_info.
5. seed.ts exports seedBase(): upsert every catalog policy, then upsert one fixed trainer and one fixed admin (fixed e-mails, bcrypt-hashed passwords from the env values) with only their designated policies, indefinitely. Staff rows keep birthdate, photo, embedding, aptitude_status and membership fields null (FR-44).

Acceptance criteria:
- Migrations apply on an empty database and the tables match the doc.
- A duplicate e-mail, a duplicate (user, policy) pair, and a grant pointing to a missing user or policy are all rejected.
- The seed run twice creates no duplicates; the trainer holds no admin-only policy and neither staff account holds a member policy.

Tests:
- Vitest against the test database for the criteria above. Run only the db tests.

Final response:
- Respond in at most 10 lines with files created, commands run, and pending items.
