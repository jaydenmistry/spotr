@AGENTS.md

# Spotr — codebase map

Spotr is a "reverse CRM" for dealership vehicle acquisition: it pulls private-party/dealer listings from the Marketcheck API into a SQLite database and presents them as a kanban pipeline + inventory browser behind a single-admin login.

## Stack (do not swap without discussion)
- Next.js 16.2.9, App Router, `src/` layout. **Next 16 renamed `middleware` to `proxy`** — the route guard lives in `src/proxy.ts` (exports `proxy()` + `config.matcher`). Consult `node_modules/next/dist/docs/` before using any Next API.
- React 19, TypeScript strict, npm.
- Prisma 5 + SQLite (`prisma/schema.prisma`; models: User, Lead, Message). No migrations — schema is applied with `prisma db push` (see `docker-entrypoint.sh`).
- NextAuth v4 (credentials + JWT, bcryptjs). Single admin user seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD` by `prisma/seed.js`.
- Styling is **inline React style objects** on a dark theme (CSS vars in `src/app/globals.css`). Tailwind 4 is installed via PostCSS but barely used — match the inline-style idiom of surrounding code.
- Icons: lucide-react. Kanban drag-and-drop: @hello-pangea/dnd. HTTP: axios.
- No test framework, no CI.

## Commands
- `npm run dev` / `build` / `start` / `lint` (eslint) / `seed` (admin user upsert)
- Typecheck: `npx tsc --noEmit`

## Key paths
- Pages: `src/app/page.tsx` (marketing landing), `src/app/login/page.tsx`, `src/app/dashboard/page.tsx` (pipeline kanban + Marketcheck pull controls), `src/app/dashboard/inventory/page.tsx` (filter/sort/paginate grid).
- API: `src/app/api/leads/route.ts` (GET list, PATCH stage), `src/app/api/leads/fetch/route.ts` (POST — pulls from Marketcheck, dedupes by VIN, rate-limited), `src/app/api/health/route.ts`, `src/app/api/auth/[...nextauth]/route.ts`.
- Domain logic: `src/lib/vehicleAnalytics.ts` — the shared `LeadRecord` type, filtering/sorting, and `getVehicleAnalytics()` (**deterministic heuristic scoring, not a real model** — trend numbers, comp counts, and graph points are synthesized).
- Mock UI (not wired to backend): `src/components/dashboard/modal/ChatMock.tsx` (canned seller reply; ignores `leadId` — the `Message` Prisma model is currently unused), `CarfaxMock.tsx`.
- Deployment: `Dockerfile` + `docker-entrypoint.sh` (db push → seed → next start), Dokploy at spotrcars.com, SQLite volume at `/app/data`. `NEXT_PUBLIC_*` vars are inlined at build time.

## Gotchas
- Paid API: every `POST /api/leads/fetch` fans out into many Marketcheck requests — keep the rate limit and pull ceilings intact.
- `GET /api/leads` filters out legacy demo rows (VINs prefixed `SPOTR-`/`LIVE-`, unsplash photos); the production DB may still contain them.
- The in-memory rate limiter (`src/lib/rateLimit.ts`) is per-instance by design (single container).
- `scripts/refresh-leads.mjs` **deletes all leads**, then calls the fetch API unauthenticated (will 401) — treat as broken/dangerous; don't run it.
- `.env` is gitignored; never commit secrets. `.env.example` documents required vars.
