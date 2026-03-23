# Tech Stack

---

## Framework & Core

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.x | App Router framework |
| `react` / `react-dom` | 19.x | UI library |
| `typescript` | 5.x | Type safety |
| `tailwindcss` | 4.x | Utility-first CSS |
| `shadcn` | 3.x | Component library (radix-ui primitives) |

---

## Backend & Database

| Package | Version | Purpose |
|---------|---------|---------|
| `prisma` | 6.x | ORM + migration tool |
| `@prisma/client` | 6.x | Type-safe DB client |
| `next-auth` | 5.0.0-beta.30 | Authentication (credentials) |
| `bcryptjs` | 3.x | Password hashing |
| `zod` | 4.x | Schema validation |

---

## Frontend Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-query` | 5.x | Server state, caching |
| `react-hook-form` | 7.x | Form state management |
| `@hookform/resolvers` | 5.x | Zod integration for RHF |
| `recharts` | 3.x | Charts (weight trends, body comp) |
| `date-fns` | 4.x | Date utilities |
| `sonner` | 2.x | Toast notifications |
| `lucide-react` | 0.577.x | Icons |

---

## File Storage

| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-s3` | 3.x | S3 client |
| `@aws-sdk/s3-request-presigner` | 3.x | Presigned upload URLs |

Progress photos are uploaded directly from the browser to S3 via presigned URLs (never proxied through Next.js).

---

## Testing Stack

| Package | Purpose |
|---------|---------|
| `vitest` | Unit, service, and API tests |
| `@vitejs/plugin-react` | React component testing |
| `@testing-library/react` | Component render + interaction |
| `@testing-library/jest-dom` | DOM assertion matchers |
| `@testing-library/user-event` | Simulated user interactions |
| `msw` | API mock service worker |
| `jsdom` | DOM environment for unit tests |
| `@playwright/test` | End-to-end browser tests |
| `@vitest/coverage-v8` | Test coverage reporting |

### Test Priority Matrix

| Layer | Tool | What to test |
|-------|------|-------------|
| Algorithm logic | Vitest | EMA, confidence score, fat loss, hydration correction, plateau detection |
| Service functions | Vitest + MSW | DB queries, business logic, error cases |
| API routes | Vitest | Request validation, auth, response shapes |
| UI components | Vitest + RTL | Form validation, conditional rendering |
| Full user flows | Playwright | Log entry → dashboard update, goal setting, progress chart |

### TDD Approach

Red-Green-Refactor for all logic:
1. **RED**: Write failing tests against the spec
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up without breaking tests

Algorithm functions (`src/lib/algorithms/`) are pure functions — highly testable with unit tests only. No mocking needed.

---

## Development Setup

```bash
# Install dependencies
pnpm install

# Copy env file and fill in values
cp .env.example .env.local

# Run database migration
pnpm db:migrate

# Seed demo user
pnpm db:seed

# Start development server
pnpm dev
```

### Environment Variables

See `.env.example` for all required variables. All variables are validated at startup via Zod in `src/lib/env.ts`.

Required for local development:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — Generate with `openssl rand -base64 32`

Optional for local development (S3 features will be disabled without these):
- `AWS_*` — S3 credentials for progress photo uploads

---

## Auth Architecture

NextAuth v5 with credentials provider (email + password). Two config files:
- `src/lib/auth.config.ts` — Edge-compatible config (used in middleware)
- `src/lib/auth.ts` — Full config with Prisma adapter (used in API routes and server components)

Middleware at `src/middleware.ts` protects all `/dashboard/*`, `/log`, `/progress`, `/insights`, `/goals` routes. Unauthenticated users are redirected to `/login`.

---

## Service Layer Pattern

All database access goes through service functions in `src/lib/services/`. Pages and API routes call services — never Prisma directly.

```
src/app/(dashboard)/log/page.tsx
  → calls src/lib/services/log.service.ts
    → calls prisma client
```

This keeps database logic testable, reusable, and decoupled from HTTP/UI concerns.
