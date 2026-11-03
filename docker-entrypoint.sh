#!/bin/sh
set -e

DB_PATH="${DATABASE_URL#file:}"
mkdir -p "$(dirname "$DB_PATH")"

echo "Applying database migrations..."
node prisma/migrate.js

echo "Seeding admin user..."
node prisma/seed.js

echo "Starting Next.js on port ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
