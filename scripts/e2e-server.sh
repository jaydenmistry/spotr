#!/usr/bin/env bash
# Starts a production build against a throwaway e2e database for Playwright.
# Expects `npm run build` to have run first.
set -euo pipefail
cd "$(dirname "$0")/.."

export E2E=1
export DATABASE_URL="file:./e2e.db"
export NEXTAUTH_SECRET="e2e-only-secret"
export NEXTAUTH_URL="http://localhost:3200"
export ADMIN_EMAIL="e2e@spotr.test"
export ADMIN_PASSWORD="e2e-password-123"

rm -f prisma/e2e.db prisma/e2e.db-journal
npx prisma db push --skip-generate >/dev/null
node prisma/seed.js
node scripts/seed-e2e.mjs
exec npx next start -p 3200
