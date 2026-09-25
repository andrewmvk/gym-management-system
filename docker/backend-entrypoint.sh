#!/usr/bin/env bash
# Runs PostgreSQL and the API in one container (course requirement: exactly two containers).
# Modes: "api" (default) starts both; "db-only" starts just PostgreSQL for host-side pnpm dev.
set -euo pipefail

MODE="${1:-api}"
PG_BIN="$(ls -d /usr/lib/postgresql/*/bin | head -n 1)"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
SOCKET_DIR=/run/postgresql
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
TEST_DB="${POSTGRES_DB}_test"

API_PID=""
PG_PID=""

log() { echo "[entrypoint] $*"; }
as_postgres() { gosu postgres "$@"; }
psql_admin() { as_postgres "$PG_BIN/psql" -h "$SOCKET_DIR" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -tAc "$1"; }

shutdown() {
  log "stopping"
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill -TERM "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$PG_PID" ] && kill -0 "$PG_PID" 2>/dev/null; then
    # SIGINT is PostgreSQL's "fast" shutdown: rolls back open transactions and exits cleanly.
    kill -INT "$PG_PID" 2>/dev/null || true
    wait "$PG_PID" 2>/dev/null || true
  fi
  exit "${1:-0}"
}
trap 'shutdown 0' TERM INT

mkdir -p "$PGDATA" "$SOCKET_DIR"
chown -R postgres:postgres "$PGDATA" "$SOCKET_DIR"
chmod 700 "$PGDATA"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  log "first boot: initializing the PostgreSQL data directory"
  pwfile="$(mktemp)"
  printf '%s' "$POSTGRES_PASSWORD" > "$pwfile"
  chown postgres "$pwfile"
  as_postgres "$PG_BIN/initdb" -D "$PGDATA" -U "$POSTGRES_USER" --pwfile="$pwfile" \
    --auth-local=trust --auth-host=scram-sha-256 > /dev/null
  rm -f "$pwfile"
  # The published port is bound to 127.0.0.1 by compose, so accepting any source address here only admits the host.
  echo "host all all 0.0.0.0/0 scram-sha-256" >> "$PGDATA/pg_hba.conf"
fi

log "starting PostgreSQL"
# Called without the as_postgres function on purpose: backgrounding a function forks a subshell, so $! would be
# that subshell instead of postgres and the shutdown signal would never reach the server.
gosu postgres "$PG_BIN/postgres" -D "$PGDATA" -c listen_addresses='*' -k "$SOCKET_DIR" &
PG_PID=$!

for _ in $(seq 1 60); do
  if "$PG_BIN/pg_isready" -h "$SOCKET_DIR" -U "$POSTGRES_USER" -d postgres -q; then break; fi
  if ! kill -0 "$PG_PID" 2>/dev/null; then log "PostgreSQL exited during startup"; exit 1; fi
  sleep 0.5
done
"$PG_BIN/pg_isready" -h "$SOCKET_DIR" -U "$POSTGRES_USER" -d postgres -q || { log "PostgreSQL did not become ready in time"; shutdown 1; }

for db in "$POSTGRES_DB" "$TEST_DB"; do
  if [ "$(psql_admin "SELECT 1 FROM pg_database WHERE datname = '$db'")" != "1" ]; then
    log "creating database $db"
    psql_admin "CREATE DATABASE \"$db\""
  fi
done

if [ "$MODE" = "db-only" ]; then
  # pnpm db:up waits for this marker, so it only returns once both databases exist.
  touch /tmp/cadence-db-ready
  log "database-only mode: PostgreSQL is ready, the API is not started"
  wait "$PG_PID" || true
  shutdown 0
fi

cd /app/apps/api
has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)"; }

if has_script db:migrate; then
  log "running db:migrate"
  pnpm run db:migrate
else
  log "no db:migrate script yet, skipping migrations"
fi

# The seed is idempotent, so running it on every boot covers the first boot without tracking state.
if has_script db:seed; then
  log "running db:seed"
  pnpm run db:seed
fi

log "starting the API"
./node_modules/.bin/tsx src/index.ts &
API_PID=$!

# Returns as soon as either process exits; the container stops instead of running half the backend.
set +e
wait -n "$API_PID" "$PG_PID"
status=$?
set -e
log "a backend process exited with status $status"
shutdown "$status"
