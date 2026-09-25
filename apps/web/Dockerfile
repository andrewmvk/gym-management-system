# Build context: repository root (see docker-compose.yml).
FROM node:22-trixie-slim

RUN npm install -g pnpm@12.6.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@cadence/web..."

# The api source is only needed for the AppRouter type during next build's type check.
COPY apps/web apps/web
COPY apps/api apps/api
COPY packages/shared packages/shared

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, not read at runtime.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @cadence/web build

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["./node_modules/.bin/next", "start", "-p", "3000"]
