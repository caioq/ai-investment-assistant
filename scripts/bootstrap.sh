#!/usr/bin/env bash
# One-command local setup: check Node, install deps, start Postgres, prepare
# apps/api/.env, run migrations, generate the Prisma client, build
# packages/shared. Idempotent -- safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

# Seeds only when --seed is passed explicitly; any other argument is an error.
SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    *) echo "Unknown argument: $arg (supported: --seed)" >&2; exit 2 ;;
  esac
done

# Prisma 7 is the strictest dependency: ^20.19 || ^22.12 || >=24.0 (mirrored in
# package.json -> engines). Fail here with a clear message rather than deep inside
# pnpm install or prisma.
if ! node -e '
  const [maj, min] = process.versions.node.split(".").map(Number);
  process.exit((maj === 20 && min >= 19) || (maj === 22 && min >= 12) || maj >= 24 ? 0 : 1);
'; then
  echo "Node $(node -v) is not supported: need ^20.19, ^22.12 or >=24.0 (22 LTS recommended, see .nvmrc)." >&2
  exit 1
fi

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

# JWT_SECRET ships empty in .env.example, and passport-jwt refuses to start
# with an empty secret ("JwtStrategy requires a secret or key"), so the API
# would never boot on a fresh clone. Generate a random local one if it's
# empty or missing; a value that's already set is never touched.
if ! grep -qE '^JWT_SECRET=.+' apps/api/.env; then
  echo "==> Generating a local JWT_SECRET"
  JWT_SECRET_VALUE="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  if grep -qE '^JWT_SECRET=' apps/api/.env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET_VALUE}|" apps/api/.env
    else
      sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET_VALUE}|" apps/api/.env
    fi
  else
    echo "JWT_SECRET=${JWT_SECRET_VALUE}" >> apps/api/.env
  fi
fi

echo "==> Running Prisma migrations"
pnpm db:migrate

# Prisma 7's `migrate dev` no longer runs `prisma generate`, and `pnpm dev`
# (nest start --watch) has no generate step either, so without this a fresh
# clone has no apps/api/generated/prisma and both the API and the seed fail
# with "Cannot find module '../../generated/prisma/client'".
echo "==> Generating the Prisma client"
pnpm --filter api run db:generate

echo "==> Building packages/shared"
pnpm --filter @ai-investment-assistant/shared build

if [ "$SEED" = true ]; then
  echo "==> Seeding the demo account"
  pnpm db:seed
  echo "    Demo login: demo@example.com / Demo1234!"
fi

echo ""
echo "Setup complete. Run 'pnpm dev' to start both apps."
echo "(For apps/api's e2e tests against a real database, also run: docker compose up -d db-test)"
