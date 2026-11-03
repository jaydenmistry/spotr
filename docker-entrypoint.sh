#!/bin/sh
set -e

DB_PATH="${DATABASE_URL#file:}"
mkdir -p "$(dirname "$DB_PATH")"

echo "Applying database migrations..."
node prisma/migrate.js

echo "Seeding admin user..."
node prisma/seed.js

# Daily backup copies in /app/data/backups (prisma/backup.js). Checks hourly;
# each run is a no-op once today's copy exists, so restarts don't add more.
(while true; do node prisma/backup.js || true; sleep 3600; done) &

echo "Starting Next.js on port ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
