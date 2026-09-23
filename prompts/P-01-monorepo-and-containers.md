Blocked by: none
Covers: NFR-3, NFR-5
MVP: 1
Artifacts: root workspace files, apps/web/, apps/api/, packages/shared/, docker-compose.yml, apps/web/Dockerfile, apps/api/Dockerfile, docker/backend-entrypoint.sh, .env.example
Evidence: npm run dev and docker compose up --build both start the system; system.health answers; a missing env var stops the api with a clear message; database data survives docker compose down and up

Task: scaffold the monorepo and the two-container setup.

Context:
- Layout: the "Repo layout" section of AGENTS.md. Stack and environment variables: docs/04-architecture.md §1, §2 and §9. Conventions: rules/naming-conventions.md, rules/backend.md, rules/frontend.md, rules/testing.md, rules/error-handling.md.
- Course requirement: exactly two containers, one for the frontend (Next.js) and one for the backend (Node API and PostgreSQL together). This is a first generation that never goes to production, so no replicas, hardening, or image copies.

Permitted scope:
- Only create the root workspace files, apps/web, apps/api, packages/shared, the Docker files, and .env.example.
- npm workspaces only. Allowed dependencies: next, react, react-dom, tailwindcss, the shadcn/ui setup, express, cors, cookie-parser, @trpc/server, @trpc/client, @trpc/tanstack-react-query, @tanstack/react-query, zod, pino, dotenv, typescript, tsx, vitest, react-hook-form, @hookform/resolvers, class-variance-authority, clsx, tailwind-merge, sonner. Anything else needs a justification and approval.
- Don't create database code, auth, or any router other than a health procedure.

Functional requirements:
1. Root: package.json with workspaces, a strict tsconfig.base.json, .gitignore (node_modules, .env, uploads, build output), and .env.example listing the variables from docs/04-architecture.md §9 without secrets.
2. apps/api: Express host with CORS (credentials enabled, restricted to the frontend origin), cookie parsing, the tRPC adapter at /trpc, a public system.health procedure, a pino logger tagging each request with a requestId, and a zod env loader that fails fast at startup.
3. apps/web: Next.js App Router with Tailwind and shadcn/ui initialized and a home page.
4. packages/shared: a workspace package importable by both apps, with an empty src/auth/ folder.
5. Root scripts: dev (web and api together), build, test.
6. docker-compose.yml with two services. frontend builds apps/web (port 3000, NEXT_PUBLIC_API_URL points to the backend). backend uses one image containing Node and PostgreSQL; its entrypoint initializes the data directory on first boot, starts PostgreSQL, waits until it accepts connections, runs db:migrate when that script exists (otherwise logs and skips), then starts the API, and forwards signals so docker compose down stops both processes. Volumes: pgdata and uploads. Port 4000 for the API; 5432 is not published.

Acceptance criteria:
- npm install from a clean clone works and npm run dev serves both apps; the layout matches AGENTS.md.
- docker compose up --build brings up exactly two containers and the web app reaches the API.
- Starting the API without a required env var fails with a message naming it.
- No secret is baked into an image or committed.

Tests:
- One Vitest smoke test for the health procedure and one trivial test in packages/shared. Run only those.

Final response:
- Respond in at most 10 lines with files created, commands run, and pending items.
