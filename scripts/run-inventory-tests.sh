#!/usr/bin/env bash
set -e

echo "=== Running Spotr Inventory Page Unit Tests ==="
npm run test:inventory

echo ""
echo "=== Running Full Test Suite ==="
npm test

echo ""
echo "=== Running Typecheck ==="
npx tsc --noEmit

echo ""
echo "=== Running Linter ==="
npm run lint

echo ""
echo "✅ All inventory tests and quality checks passed successfully!"
