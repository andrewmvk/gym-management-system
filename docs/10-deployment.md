# Public Deployment (MVP 6, NFR-7)

This is additive to the course deliverable, not a replacement for it: `docker compose up` (local, bundled
Postgres) stays the dev/grading environment described everywhere else in `docs/`. This document covers
the separate, free-tier public deployment decided in audit-log item 32, whose only purpose is giving the
PWA (`P-33`) a real HTTPS origin a phone can install it from.

## Why three separate free services, not one

`apps/api/Dockerfile` bundles PostgreSQL inside the API container on purpose (the course's "exactly two
containers" requirement). Free hosting tiers rarely give a container a persistent disk large enough for a
real database, so the public deployment splits the two concerns instead: a managed free Postgres (Neon)
the API container connects to over the network, with no local Postgres process at all. The API image
supports this without any change to its default behavior - `docker/backend-entrypoint.sh`'s
`api-external-db` mode (`P-34`) skips the local PostgreSQL bootstrap entirely and only runs when a
platform explicitly selects it as the start command; `docker compose up` still runs the default `api`
mode, bundled Postgres included, exactly as before.

| Piece | Service | Why |
|---|---|---|
| Frontend (`apps/web`) | [Vercel](https://vercel.com) | Zero-config Next.js hosting, free Hobby tier, automatic HTTPS |
| Database | [Neon](https://neon.com) | Free serverless Postgres, 1 GB storage, no time limit |
| API (`apps/api`) | [Render](https://render.com) | Free Web Service running the existing Dockerfile; the free tier sleeps after 15 minutes idle (first request after that is slower) |

All three have a genuinely free tier (checked 2026-10-13); only Render's needs a Docker-capable free
"Web Service", not every host has one. If a free host's terms have changed by the time this is read,
re-check its pricing page before assuming the steps below still apply.

## 1. Database - Neon

1. Create a free account at neon.com, create one project.
2. Copy its connection string (the one with `?sslmode=require`) - this is `DATABASE_URL` for the next step.
3. Nothing else to configure: `P-34`'s migration fix handles a brand-new, empty database correctly (it
   was verified locally against a from-scratch Postgres before this guide was written).

## 2. API - Render

1. Create a free account at render.com, connect the GitHub repo, create a new **Web Service**.
2. Environment: **Docker**, Dockerfile path `apps/api/Dockerfile`, build context the repo root.
3. **Start Command override**: `backend-entrypoint api-external-db` (the image's default `CMD` is plain
   `api`, which bundles Postgres - this override is what makes Render run only the API, against Neon).
4. Environment variables (Render's dashboard, not a committed file - see `.env.example` for every
   variable's purpose):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `JWT_SECRET` | a new random 32+ character string (not the local dev one) |
   | `KIOSK_API_KEY` | a new random 16+ character string |
   | `SEED_TRAINER_PASSWORD`, `SEED_ADMIN_PASSWORD`, `SEED_STUDENT_PASSWORD` | your choice, 8+ characters |
   | `WEB_ORIGIN` | the Vercel URL from step 3 (needed for CORS) |
   | `API_PORT` | `4000` |
   | `NODE_ENV` | `production` (turns on the `Secure` cookie flag) |
   | `AI_MODE` | `live` with `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`, or `mock` to skip the network |
   | `EMAIL_MODE` | `log` (free, writes to Render's log) or `resend` with `RESEND_API_KEY`/`EMAIL_FROM` |
   | `FACE_EMBEDDING_MODE` | `stub` (the real mode's model weights make the image considerably larger) |
   | `UPLOADS_DIR` | `/app/uploads` - uploaded files do not survive a Render free-tier restart; this is a known limitation of the free tier, not a bug |

5. Deploy. The first boot runs `db:migrate` then `db:seed` against Neon before the API starts (same as
   local Docker Compose) - watch the Render logs for `"migrations applied"` and `"base seed applied"`.
6. Copy the Render service's public URL - this is `NEXT_PUBLIC_API_URL` for the next step.

## 3. Frontend - Vercel

1. Create a free account at vercel.com, import the GitHub repo.
2. **Root Directory**: `apps/web` (this is a pnpm workspace monorepo; Vercel needs to know where the
   Next.js app actually lives).
3. Environment variables:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the Render URL from step 2.6 |
   | `KIOSK_API_KEY` | the same value set on Render. `apps/web/next.config.ts` remaps it to `NEXT_PUBLIC_KIOSK_API_KEY` at build time (so it reaches the kiosk page's client bundle) - set the plain `KIOSK_API_KEY` name here, not the `NEXT_PUBLIC_` one |

4. Deploy. Update the API's `WEB_ORIGIN` env var on Render to this Vercel URL once you have it (step 2.4
   needs the real URL, not a guess), and redeploy the API so CORS allows it.

## Verifying installability

Once both are deployed: open the Vercel URL on a phone, confirm `/manifest.webmanifest` and the icon
routes resolve (same checks as `P-33`'s evidence, now over the real HTTPS origin instead of `localhost`),
and use the browser's "Add to Home Screen" / install prompt.

## Known limitations of this deployment (by design, not bugs)

- Render's free tier has no persistent disk: uploaded files (exam attachments, reference photos) are
  lost on every restart. Fine for a demo; would need Render's paid disk or S3-compatible storage otherwise.
- Render's free tier sleeps after 15 minutes idle; the first request afterward is slow (cold start).
- No custom domain - the free `*.vercel.app` / `*.onrender.com` subdomains are used as-is (NFR-7, decided
  deliberately: a paid domain is explicitly out of scope, see `docs/02-requirements.md`).
