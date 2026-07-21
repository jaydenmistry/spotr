# 🚘 Spotr — Vehicle Acquisition Intelligence Platform

**Spotr** is a B2B dealer vehicle-acquisition platform designed for auto dealerships and used-car managers. It streamlines the discovery, evaluation, scoring, and tracking of private-party vehicle opportunities.

---

## 🌟 Key Features

- 🎯 **Opportunity Feed**: Algorithmic scoring of acquisition candidates against customizable BuyBox parameters (year, mileage, search radius, target gross profit margins).
- 📊 **Kanban Acquisition Pipeline**: Interactive drag-and-drop workflow tracking vehicle leads across stages (New Leads, Contacted, Appraised, Offered, Acquired, Passed).
- 🔍 **Inventory Intelligence Grid**: Comprehensive search, multi-factor filtering (asking price, distance, make counts, trend heuristics), sorting, and server-side pagination.
- 📈 **Vehicle Market Analytics**: Deterministic market evaluation detailing comparable listings, acquisition score breakdown, price confidence, and target gross profit logic.
- 📝 **Buyer Audit Trail & Action Timeline**: Append-only activity logger recording stage transitions, follow-up scheduling, offer history, and standardized loss reasons inside transactional database boundaries.
- 🔌 **Compliant Connectors**: Marketcheck API connector for fetching active vehicle listings with rate limiting and automated VIN deduplication.

---

## 🛠️ Tech Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.2.9** | App Router (`src/` architecture) with custom `proxy.ts` middleware guard |
| **Frontend** | **React 19** + **TypeScript** | Strict typing with responsive custom UI components |
| **Styling** | **Vanilla CSS** + **Tailwind CSS v4** | Dynamic theme variables with PostCSS pipeline |
| **Database & ORM** | **Prisma 5** + **SQLite** | Indexed schema for VIN lookups, lead stages, and activity logs |
| **Authentication** | **NextAuth.js v4** | Credentials provider, JWT sessions, and `bcryptjs` hashing |
| **Drag & Drop** | **`@hello-pangea/dnd`** | Accessible Kanban board interactions |
| **Testing Suite** | **Vitest** + **Testing Library** | Full unit and component testing suite |

---

## 📁 Project Structure

```
spotr-startup/
├── prisma/
│   ├── schema.prisma          # Database models (User, Lead, Message, BuyBox, Activity)
│   └── seed.js                # Admin seed script
├── scripts/
│   └── run-inventory-tests.sh   # Full verification test runner
├── src/
│   ├── app/
│   │   ├── api/               # API endpoints (leads, feed, action, buybox, followup, fetch)
│   │   ├── dashboard/         # Dashboard views (Kanban, Opportunity Feed, Inventory)
│   │   ├── login/             # Auth login view
│   │   ├── globals.css        # Global CSS variables & layout resets
│   │   └── page.tsx           # Product marketing landing page
│   ├── components/            # Reusable UI components & modals (CarfaxMock, ChatMock)
│   ├── lib/                   # Core business logic (analytics, buyBox, followUp, leadFilters)
│   └── proxy.ts               # Route auth guard (Next.js 16 proxy convention)
├── Dockerfile                 # Multi-stage production container build
└── docker-entrypoint.sh       # Container entrypoint (db push -> seed -> next start)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or later
- **npm**: `v10.x` or later

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure variables in `.env`:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-development-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ADMIN_EMAIL="admin@spotrcars.com"
   ADMIN_PASSWORD="password123"
   MARKETCHECK_API_KEY="your-optional-marketcheck-key"
   ```

### Installation & Initialization

```bash
# 1. Install dependencies
npm install

# 2. Apply database schema
npx prisma db push

# 3. Seed initial admin user
npm run seed
```

### Running Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the verification test suite to ensure system integrity across inventory, scoring, and follow-up handlers:

```bash
# Run inventory unit tests (13+ test scenarios)
npm run test:inventory

# Run full test suite runner script
./scripts/run-inventory-tests.sh

# Run all Vitest unit tests
npm test
```

---

## 📦 Containerization & Deployment

Spotr is packaged for single-container deployment (using SQLite with persistent volume mounts).

```bash
# Build Docker image
docker build -t spotr-app .

# Run container locally
docker run -d -p 3000:3000 -v spotr_data:/app/prisma --name spotr spotr-app
```

---

## 📜 Core Business & Compliance Guidelines

- **Price Transparency**: Distinct separation between seller listing asking price, estimated retail value, target acquisition cost, and gross profit target calculations.
- **Auditability**: All state mutations (stage updates, notes, passes, assignments) are recorded in an append-only audit trail inside atomic database transactions.
- **Compliant Sourcing**: Vehicle data fetching relies strictly on official APIs (Marketcheck) and authorized data feeds, maintaining strict API rate-limit controls.
