@AGENTS.md

# Spotr

Spotr is a B2B, multi-tenant dealer vehicle-acquisition intelligence platform. It helps used-car managers discover, assess, and acquire private-party vehicle opportunities.

**Current state vs. target:** the codebase today is a working single-tenant v1 — one seeded admin user, one Marketcheck connector, a kanban pipeline, and an inventory browser. Multi-tenancy, RBAC, and real messaging are *target* capabilities, not present ones. Never assume tenancy or roles exist in a query; check the schema first. Preserve and extend this app — do not rebuild it from scratch.

## Codebase map

- **Stack:** Next.js 16.2.9 (App Router, `src/` layout), React 19, TypeScript strict, npm. **Next 16 renamed `middleware` to `proxy`** — the auth route guard lives in `src/proxy.ts` (exports `proxy()` + `config.matcher`). Consult `node_modules/next/dist/docs/` before using any Next API (see AGENTS.md).
- **Data:** Prisma 5 + SQLite (`prisma/schema.prisma`; models: User, Lead, Message). No migrations yet — schema is applied with `prisma db push` at container start (`docker-entrypoint.sh`). Keep schema changes additive until real migrations are adopted.
- **Auth:** NextAuth v4 (credentials + JWT, bcryptjs). Single admin user seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD` by `prisma/seed.js`. NextAuth v4 on React 19/Next 16 is a compatibility corner — the riskiest dependency to touch.
- **Styling:** inline React style objects on a dark theme (CSS vars in `src/app/globals.css`). Tailwind 4 is installed via PostCSS but barely used — match the inline-style idiom of the surrounding code, don't introduce a new styling system.
- **UI libs:** lucide-react icons, @hello-pangea/dnd (kanban), axios (client HTTP).
- **Pages:** `src/app/page.tsx` (marketing landing), `src/app/login/page.tsx`, `src/app/dashboard/page.tsx` (pipeline kanban + Marketcheck pull controls), `src/app/dashboard/feed/page.tsx` (Opportunity Feed — heuristic-scored acquisition cards with Watch/Assign/Pass), `src/app/dashboard/inventory/page.tsx` (filter/sort/paginate grid).
- **API:** `src/app/api/leads/route.ts` (GET list, PATCH stage), `src/app/api/leads/feed/route.ts` (GET — server-paginated feed; `?page=&view=active|watching|passed`; includes `SPOTR-FEED-` fixtures in development only), `src/app/api/leads/action/route.ts` (POST — feed actions watch/unwatch/pass/unpass/assign/unassign on `Lead.watchedAt`/`passedAt`/`assignedTo`, rate-limited 60/min/IP), `src/app/api/leads/fetch/route.ts` (POST — pulls from Marketcheck, dedupes by VIN, rate-limited), `src/app/api/health/route.ts`, `src/app/api/auth/[...nextauth]/route.ts`. All lead endpoints require a session. Shared lead filters live in `src/lib/leadFilters.ts`; the feed-action enum in `src/lib/feedActions.ts`.
- **Domain logic:** `src/lib/vehicleAnalytics.ts` — shared `LeadRecord` type, filtering/sorting, and `getVehicleAnalytics()` (**deterministic heuristic, not a real model** — trend numbers, comp counts, confidence, and graph points are synthesized). `src/lib/opportunity.ts` — pure `getOpportunityAssessment()` for the feed (score + factor breakdown, estimated range, completeness, confidence; built on `getVehicleAnalytics()`, same heuristic caveat — UI must label outputs as Spotr estimates).
- **Mock UI (not wired to backend):** `src/components/dashboard/modal/ChatMock.tsx` (canned seller reply; ignores `leadId` — the `Message` Prisma model is currently unused), `CarfaxMock.tsx`.
- **Deployment:** `Dockerfile` + `docker-entrypoint.sh` (db push → seed → next start), Dokploy at spotrcars.com, SQLite volume at `/app/data`, healthcheck on `/api/health`. `NEXT_PUBLIC_*` vars are inlined at build time. Single-container assumption is deliberate (SQLite + in-memory rate limiter).

## Commands

- `npm run dev` / `npm run build` / `npm run start`
- Lint: `npm run lint` · Typecheck: `npx tsc --noEmit` · Seed admin: `npm run seed`
- Tests: `npm test` (Vitest, `src/**/*.test.ts` — currently pure `src/lib` logic only).
- `npm run seed:fixtures` — opt-in, dev-only synthetic feed fixtures (`SPOTR-FEED-` VINs); never run in production/entrypoint.

## Product & data rules (non-negotiable)

- **Price semantics:** clearly distinguish *asking price*, *sold price*, *auction result*, *dealer retail listing price*, and *internal estimated value* in schemas, APIs, charts, and UI. Today `Lead.price` is the listing **asking price** (Marketcheck active listings) and everything from `getVehicleAnalytics()` is an **internal synthesized estimate**. Never present one as the other; when adding fields, name them unambiguously (e.g. `askingPrice`, `estimatedValue`), don't overload `price`.
- **Provenance, freshness, confidence:** wherever vehicle or market data is shown, show its source (`Lead.source` exists), how fresh it is (`createdAt`/`updatedAt` exist), and confidence. Heuristic outputs must be labeled as estimates — the current UI presents synthesized analytics as "AI scoring"; fix that gap when touching those surfaces rather than extending it.
- **Synthetic data is labeled:** use clearly labeled synthetic/fixture data until an approved provider is configured. Existing convention: fixture VINs are prefixed `SPOTR-`/`LIVE-` and are filtered out of `GET /api/leads`; keep that convention for new fixtures. `ChatMock`/`CarfaxMock` are UI fixtures — keep the "Mock" naming until they have real backends.

## Compliance rules (non-negotiable)

- **No prohibited automation:** do not implement scraping that violates a source's rules, login automation, CAPTCHA bypass, Facebook Marketplace automation, Craigslist automation, or any mechanism intended to evade a source's terms — even if marketing copy (`src/app/page.tsx` mentions those marketplaces) implies it. Marketing claims do not authorize implementation.
- **Connectors are compliant interfaces only:** licensed data feeds, official APIs (the existing Marketcheck integration is the reference pattern), approved partners, seller opt-in, manual/dealer imports, or explicitly permitted feeds. New connectors follow the `api/leads/fetch` shape: authenticated, rate-limited, deduped, provider errors surfaced.
- **Seller PII is minimized:** collect only what acquisition requires (`sellerName`, `sellerPhone` exist and `sellerPhone` is currently never populated — keep it that way absent a compliant source). Plan for tenant isolation, RBAC, auditability, and deletion/opt-out paths when building toward multi-tenancy.
- **Paid API discipline:** every `POST /api/leads/fetch` fans out into many metered Marketcheck requests. Keep the rate limit (10 pulls / 10 min / IP) and pull ceilings (max 1500) intact.

## Engineering process

- Inspect the relevant existing code before each task; follow existing conventions (package manager, styling, routing, auth, DB access) unless a change is explicitly justified.
- For meaningful changes, propose a concise plan first and wait for approval. Prefer small vertical slices over broad rewrites.
- After edits, run what actually exists: `npm run lint`, `npx tsc --noEmit`, `npm run build` (and tests once a framework is added).
- Use reviewer subagents after relevant work and fix Critical/High findings before declaring done.
- End significant work with a summary: changed files, validation run, reviewer findings, remaining risks, and the next recommended milestone.

## Gotchas

- `GET /api/leads` filters out legacy demo rows (fixture VINs, unsplash photos); the production DB may still contain them.
- `Lead.stage` is free-text with no server-side validation against the six kanban stages ("New Leads", "Contacted", "Appraisal", "Offer Made", "Acquired", "Lost") — validate when touching that path.
- `scripts/refresh-leads.mjs` **deletes all leads**, then calls the fetch API unauthenticated (will 401) — broken and dangerous; don't run it.
- The in-memory rate limiter (`src/lib/rateLimit.ts`) is per-instance by design; swap for Redis only if the app ever runs multiple replicas.
- The login page ships visible demo credentials — acceptable for the demo phase only; must be removed before real customers.
- `.env` is gitignored; never commit secrets. `.env.example` documents required vars (`MARKETCHECK_API_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, optional `NEXT_PUBLIC_*`).
