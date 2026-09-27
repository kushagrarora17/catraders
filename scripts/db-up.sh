#!/bin/sh
# Starts a local PostgreSQL container with Podman (Docker works too: CONTAINER_CLI=docker).
# Credentials match DATABASE_URL in .env.example.
set -eu

CLI="${CONTAINER_CLI:-podman}"
NAME=catraders-postgres
IMAGE=docker.io/library/postgres:17-alpine

if "$CLI" container exists "$NAME" 2>/dev/null || "$CLI" inspect "$NAME" >/dev/null 2>&1; then
  "$CLI" start "$NAME" >/dev/null
else
  "$CLI" run -d --name "$NAME" \
    -p 5432:5432 \
    -e POSTGRES_USER=catraders \
    -e POSTGRES_PASSWORD=catraders \
    -e POSTGRES_DB=catraders \
    -v catraders-pgdata:/var/lib/postgresql/data \
    "$IMAGE" >/dev/null
fi

printf 'Waiting for Postgres'
i=0
until "$CLI" exec "$NAME" pg_isready -U catraders -d catraders >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo ' timed out' >&2
    exit 1
  fi
  printf '.'
  sleep 1
done
echo ' ready on localhost:5432'
