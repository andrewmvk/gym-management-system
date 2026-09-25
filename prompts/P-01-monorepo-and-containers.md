Blocked by: none
Covers: NFR-3, NFR-5
MVP: 1
Artifacts: root workspace files (package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore, .gitattributes, .dockerignore), apps/web/, apps/api/, packages/shared/, docker-compose.yml, apps/web/Dockerfile, apps/api/Dockerfile, docker/backend-entrypoint.sh, .env.example, rules/imports.md
Evidence: pnpm dev and docker compose up --build both start the system; system.health answers; a missing env var stops the api with a clear message; database data survives docker compose down and up

Task: scaffold the monorepo and the two-container setup.

Context:
- Layout: the "Repo layout" section of AGENTS.md. Stack and environment variables: docs/04-architecture.md §1, §2 and §9. Conventions: rules/naming-conventions.md, rules/imports.md, rules/backend.md, rules/frontend.md, rules/testing.md, rules/error-handling.md.
- TypeScript 7 (the native compiler) in every workspace; Next.js runs its build-time type check through it.
- Course requirement: exactly two containers, one for the frontend (Next.js) and one for the backend (Node API and PostgreSQL together). This is a first generation that never goes to production, so no replicas, hardening, or image copies.

Permitted scope:
- Only create the root workspace files, apps/web, apps/api, packages/shared, the Docker files, and .env.example.
- pnpm workspaces only (pnpm-workspace.yaml). Allowed dependencies: next, react, react-dom, tailwindcss, the shadcn/ui setup, express, cors, cookie-parser, @trpc/server, @trpc/client, @trpc/tanstack-react-query, @tanstack/react-query, zod, pino, dotenv, typescript, tsx, vitest, react-hook-form, @hookform/resolvers, class-variance-authority, sonner, and the @types/* packages of the above. The shadcn/ui setup brings its own packages (radix-ui, lucide-react, tw-animate-css, shadcn, and cn, shadcn's replacement for clsx + tailwind-merge). Anything else needs a justification and approval.
- Don't create database code, auth, or any router other than a health procedure.

Functional requirements:
1. Root: package.json and pnpm-workspace.yaml, a strict tsconfig.base.json holding the per-package import aliases (@api/*, @shared/*; see rules/imports.md), .gitignore (node_modules, .env, uploads, build output), .gitattributes (shell scripts keep LF endings), and .env.example listing the variables from docs/04-architecture.md §9 plus POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, API_PORT and WEB_ORIGIN (the CORS origin), without secrets. A single .env at the repo root feeds docker compose, the API, and next.config.ts.
2. apps/api: Express host with CORS (credentials enabled, restricted to WEB_ORIGIN), cookie parsing, the tRPC adapter at /trpc, a public system.health procedure, a pino logger tagging each request with a requestId, and a zod env loader that fails fast at startup and names every missing or invalid variable. OPENROUTER_API_KEY, OPENROUTER_MODEL and RESEND_API_KEY stay optional until P-04 and P-05.
3. apps/web: Next.js App Router with Tailwind and shadcn/ui initialized (Radix base), the tRPC client and React Query provider, and a home page showing system.health. apps/web/AGENTS.md is a hand-edited copy of the agent notes next dev generates (without em dashes), with `agentRules: false` in next.config.ts so next dev doesn't rewrite it.
4. packages/shared: a workspace package importable by both apps, with an empty src/auth/ folder. It exports TypeScript source directly (no build step); web compiles it through transpilePackages.
5. Root scripts: dev (web and api together), build, test.
6. docker-compose.yml with two services. frontend builds apps/web (port 3000, NEXT_PUBLIC_API_URL points to the backend). backend uses one image containing Node and PostgreSQL (plus ca-certificates: postgresql pulls in ssl-cert, and without a real CA bundle pnpm rejects every registry certificate with UnknownIssuer); its entrypoint initializes the data directory on first boot, starts PostgreSQL, waits until it accepts connections, makes sure both the app database and a separate test database (for TEST_DATABASE_URL) exist, runs db:migrate and then db:seed when those scripts exist (otherwise logs and skips; the seed is idempotent, which covers the first boot), then starts the API, and forwards signals to the postgres process itself (not a wrapper shell) so docker compose down and db:down shut PostgreSQL down cleanly. The entrypoint also has a database-only mode, so pnpm dev can run the API on the host against the same image's PostgreSQL (root scripts db:up and db:down); db:up returns only once both databases exist. Volumes: pgdata and uploads. Port 4000 for the API; 5432 is published on 127.0.0.1 only, never on the network, so the host API, the tests, and Drizzle Studio can reach it. Each developer has their own local database; there is no shared hosted database.

Acceptance criteria:
- pnpm install from a clean clone works and pnpm dev serves both apps; the layout matches AGENTS.md.
- docker compose up --build brings up exactly two containers and the web app reaches the API.
- Starting the API without a required env var fails with a message naming it.
- No secret is baked into an image or committed.

Tests:
- One Vitest smoke test for the health procedure and one trivial test in packages/shared. Run only those. Once P-02 adds the test database setup, every API test run (the smoke test included) needs pnpm db:up first.

Final response:
- Respond in at most 10 lines with files created, commands run, and pending items.
