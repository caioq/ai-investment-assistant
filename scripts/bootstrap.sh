#!/usr/bin/env bash
# One-command local setup: install deps, start Postgres, prepare apps/api/.env,
# run migrations, build packages/shared. Idempotent -- safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
pnpm install

echo "==> Starting Postgres (db)"
docker compose up -d db --wait

if [ ! -f apps/api/.env ]; then
  echo "==> Creating apps/api/.env"
  cp .env.example apps/api/.env
  # DATABASE_URL ships empty in .env.example (it varies per environment); for local
  # dev it always matches docker-compose.yml's `db` service, so fill it in here.
  DEV_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investment_assistant?schema=public"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${DEV_DATABASE_URL}|" apps/api/.env
  else
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DEV_DATABASE_URL}|" apps/api/.env
  fi
  echo "    created with a local DATABASE_URL -- other vars still need filling in as their modules land"
else
  echo "==> apps/api/.env already exists, leaving it untouched"
fi

echo "==> Running Prisma migrations"
pnpm db:migrate

echo "==> Building packages/shared"
pnpm --filter @ai-investment-assistant/shared build

echo ""
echo "Setup complete. Run 'pnpm dev' to start both apps."
echo "(For apps/api's e2e tests against a real database, also run: docker compose up -d db-test)"
