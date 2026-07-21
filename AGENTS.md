<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Testing Directives

When modifying inventory features, vehicle analytics, or adding new features to the dashboard/inventory, **all agents MUST execute the unit test verification suite** before declaring work complete.

### Mandatory Verification Command
Run the inventory test script or npm command:
```bash
npm run test:inventory
# Or run the full verification script:
./scripts/run-inventory-tests.sh
```

### Test File Location
- Inventory unit tests live in: `src/app/dashboard/inventory/page.test.tsx`
- Ensure all 13+ test scenarios pass without regressions (loading, search, price range, distance, market trend, make counts/filtering, sorting, pagination, empty state, and dossier modal).
