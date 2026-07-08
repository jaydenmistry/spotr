#!/bin/sh
set -e

DB_PATH="${DATABASE_URL#file:}"
mkdir -p "$(dirname "$DB_PATH")"

if [ ! -f "$DB_PATH" ]; then
  if [ -f ./prisma/dev.db ]; then
    echo "No database found at $DB_PATH, seeding from prisma/dev.db..."
    cp ./prisma/dev.db "$DB_PATH"
  fi
fi

echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Starting Next.js on port ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
