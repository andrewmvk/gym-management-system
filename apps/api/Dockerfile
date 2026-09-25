# Build context: repository root (see docker-compose.yml).
FROM node:22-trixie-slim

# ca-certificates is required: postgresql pulls in ssl-cert, which creates /etc/ssl/certs holding only a self-signed
# certificate, and pnpm then trusts that directory instead of its built-in roots (UnknownIssuer on every download).
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql gosu ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.6.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@cadence/api..."

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint
RUN chmod +x /usr/local/bin/backend-entrypoint

ENV PGDATA=/var/lib/postgresql/data
EXPOSE 4000 5432

ENTRYPOINT ["backend-entrypoint"]
CMD ["api"]
