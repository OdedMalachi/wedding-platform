# Wedding Platform 💍

A full-stack **Multi-Wedding SaaS Platform** separated into two independent directories:
- **`wedding-web/`** — Frontend UI Application (React 19, Next.js, TypeScript, Tailwind CSS v4) running on `http://localhost:3000`
- **`wedding-api/`** — Backend REST API Server (Node.js, TypeScript, Drizzle ORM, PostgreSQL) running on `http://localhost:4000`

---

## 📁 Repository Structure

```text
wedding-platform/
├── wedding-api/                  # 👈 BACKEND ONLY (Port 4000)
│   ├── src/
│   │   ├── server.ts             # Standalone HTTP REST API Server
│   │   ├── routes/
│   │   │   └── api-router.ts     # REST endpoints (/api/weddings, /api/guests, /api/invitations, etc.)
│   │   ├── domain/
│   │   │   ├── wedding-logic.ts  # Business rules (RSVP limits, E.164 phone, CSV parser, seating capacity)
│   │   │   └── __tests__/        # Automated backend unit tests (Vitest)
│   │   ├── db/
│   │   │   ├── schema.sql        # PostgreSQL DDL tables
│   │   │   ├── schema.ts         # Drizzle ORM table definitions
│   │   │   └── store.ts          # Persistence & pre-seeded demo data
│   │   └── types/
│   │       └── wedding.ts        # Backend domain models
│   ├── package.json
│   └── tsconfig.json
│
├── wedding-web/                  # 👈 FRONTEND ONLY (Port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Couple / Organizer Dashboard (/)
│   │   │   └── i/[code]/page.tsx # Public Guest Digital Invitation (/i/:code)
│   │   ├── components/
│   │   │   ├── dashboard/        # 7-Tab Organizer Dashboard UI
│   │   │   └── invitation/       # Mobile-first Guest Invitation UI + QR Pass
│   │   ├── i18n/                 # Hebrew (RTL), Arabic (RTL), and English (LTR) dictionaries
│   │   ├── services/             # Frontend WhatsApp & API helpers
│   │   └── types/                # Frontend TypeScript interfaces
│   ├── next.config.ts            # Proxies /api/* requests to wedding-api (http://localhost:4000)
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml            # PostgreSQL 17 container setup
└── package.json                  # Workspace scripts
```

---

## 🚀 Running the Platform

1. **Start the Backend (`wedding-api` on port 4000)**:
   ```bash
   npm run dev:api
   ```
2. **Start the Frontend (`wedding-web` on port 3000)**:
   ```bash
   npm run dev:web
   ```
3. **Run Backend Unit Tests**:
   ```bash
   npm run test:api
   ```
