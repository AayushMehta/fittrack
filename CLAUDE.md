# FitTrack — Project Context for Claude

FitTrack is a fitness & body composition intelligence dashboard. It turns raw fitness data into physiological truth by applying normalization and correction algorithms on top of user-entered daily and weekly metrics. Built with Next.js 15 App Router + TypeScript. All documentation lives in `docs/`.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js v5 (credentials) |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query v5 |
| Charts | Recharts |
| File storage | AWS S3 (@aws-sdk/client-s3) |
| Dates | date-fns |

---

## Modules

| Module | Route | Docs |
|--------|-------|------|
| Dashboard | `/dashboard` | `docs/features/02-dashboard.md` |
| Daily Log | `/log` | `docs/features/01-daily-logging.md` |
| Progress | `/progress` | `docs/features/03-progress-intelligence.md` |
| Insights | `/insights` | `docs/features/04-behavior-insights.md` |
| Goals | `/goals` | `docs/features/05-goals.md` |
| Settings | `/settings` | `docs/features/06-settings.md` |

---

## Key Source Files (once created)

```
src/lib/env.ts                  — Zod-validated environment variables (serverEnv, clientEnv)
src/lib/prisma.ts               — Prisma client singleton
src/lib/auth.ts                 — NextAuth config
src/lib/s3.ts                   — S3 client, presigned URLs for progress photos
src/lib/algorithms/ema.ts       — Exponential moving average computation
src/lib/algorithms/confidence.ts — Confidence score calculation
src/lib/algorithms/fat-loss.ts  — Fat loss estimation + hydration correction
src/lib/algorithms/plateau.ts   — Plateau detection
src/middleware.ts               — NextAuth route protection
prisma/schema.prisma            — Full DB schema (5 models)
prisma/seed.ts                  — Demo user seed
```

---

## Database Models (Prisma)

`User` · `DailyLog` · `WeeklyMetric` · `ComputedMetric` · `UserGoal`

Full schema: `docs/database-schema.md`

---

## Critical Business Rules

### Data Immutability
- `DailyLog` entries are **immutable after creation** — corrections require a new entry for the same date (latest entry wins in queries)
- `ComputedMetric` is always **derived, never user-editable** — recalculated whenever new `DailyLog` or `WeeklyMetric` data arrives
- Raw data stored forever; derived data stored separately

### Weight Smoothing
- **EMA**: `EMA_today = (weight_today × 0.3) + (EMA_yesterday × 0.7)`
- Seed EMA with the first entry's raw weight
- **7-day rolling average**: mean of last 7 daily weights (requires ≥7 entries)
- See `docs/business-rules.md` for full algorithm details

### Confidence Score (0–100)
- `confidence = (proteinScore + trainingScore + activityScore) / 3`
- `proteinScore = clamp(actual_protein / goalProtein, 0, 1) × 100` — 0 if no goal set
- `trainingScore = clamp(workouts_this_week / weeklyWorkoutTarget, 0, 1) × 100`
- `activityScore = clamp(avg_steps_7d / dailyStepsTarget, 0, 1) × 100`

### Fat Loss Estimation
- `estimated_fat_loss_kg = (weekly_calorie_deficit / 7700) × (confidenceScore / 100)`
- 7700 kcal = 1 kg of fat (physiological constant)
- Only meaningful when `caloriesIntake` is logged consistently

### Hydration Correction (BIA fix)
- BIA fat% is highly sensitive to hydration
- Baseline body water: 60%
- If `bodyWaterPct > 62%` → raw fat% is artificially low → correct upward
- If `bodyWaterPct < 58%` → raw fat% is artificially high → correct downward
- Correction magnitude: ±0.5% fat per 1% deviation from baseline
- `trueFatPct` stored in `ComputedMetric`

### Plateau Detection
- If `|EMA_today - EMA_14daysAgo| < 0.1 kg` → generate plateau alert
- Alert type: `"plateau"`, severity: `"warning"`

### Decision Engine Alerts
- Fat loss < 0.2 kg/week for 14 consecutive days → suggest reducing calories by 100 kcal
- Fat loss > 1.0 kg/week → suggest increasing calories by 100 kcal (muscle loss risk)
- Protein score < 60 for 7+ consecutive days → suggest protein increase alert

### S3 File Paths
- Progress photos: `progress-photos/{userId}/{weekStartDate}/{filename}`

---

## Frontend Conventions

### Server vs Client Components
- **Server components** (`page.tsx`): Fetch data via service functions from `src/lib/services/`, handle auth with `await auth()`, pass data as props to client components
- **Client components** (`_components/*.tsx`): Interactive UI only — forms, dialogs, charts. Never import Prisma in client components

### QueryClient
- **Singleton pattern** — `QueryClient` is created as a module-level export in `src/components/providers/QueryProvider.tsx`, NOT inside `useState`
- Never use `useState(() => new QueryClient(...))` — this is a common AI-generated anti-pattern

### Data Fetching & Mutations
- **GET queries**: Use `useQuery` with a `queryFn` that calls `fetch()` directly (returns JSON)
- **POST/PUT/DELETE/PATCH**: Use `useMutation` with the shared `api()` helper from `src/lib/api.ts`
- **`api()` helper**: Typed fetch wrapper that auto-sets `Content-Type: application/json`, parses response, and throws `ApiError` on non-OK responses
- **S3 uploads** use raw `fetch()` (external URLs, non-JSON)
- **Hooks before returns**: Always place `useMutation`/`useQuery` calls BEFORE any conditional early returns

### API Response Shape
- **Success (list):** `{ data: T[], meta: { total, page, pageSize } }`
- **Success (single):** `{ data: T }`
- **Error:** `{ error: string, details?: ZodError[] }`

---

## Folder Conventions

- Pages (`page.tsx`) are **server components** — call services, not Prisma directly
- `"use client"` only for interactive forms, charts, dropdowns
- API handlers: `src/app/api/**/route.ts`
- Zod schemas: `src/lib/schemas/*.schema.ts`
- Shared utilities: `src/lib/`
- Algorithm functions: `src/lib/algorithms/`
- TanStack Query hooks: `src/hooks/use-*.ts`
- shadcn/ui components auto-generated in `src/components/ui/`

---

## Development Commands

```bash
pnpm dev                # Start dev server (Turbopack)
pnpm db:migrate         # Create + apply Prisma migration
pnpm db:generate        # Regenerate Prisma client
pnpm db:studio          # Open Prisma Studio GUI
pnpm db:seed            # Run seed (demo user)
```

---

## Environment Variables

All environment variables are validated at startup via Zod in `src/lib/env.ts`.

**Never use `process.env` directly in application code.** Instead:
```ts
import { serverEnv } from '@/lib/env'     // server-only vars
import { clientEnv } from '@/lib/env'     // NEXT_PUBLIC_* vars
import { env } from '@/lib/env'           // combined (server-side only)
```

Required variables:
```
DATABASE_URL
AUTH_SECRET
AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET / AWS_S3_ENDPOINT
NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_APP_NAME
```

---

## Documentation Structure

- **Feature docs** (`docs/features/*.md`) — Product briefs: overview, data model, pages, form fields, business rules, components, API endpoints
- **Spec files** (`src/app/(dashboard)/{module}/SPEC.md`) — Implementation blueprints: user stories, happy flows, edge cases, acceptance criteria, Zod schemas, API contracts, test scenarios
- Feature docs describe *what* and *why*; specs describe *how*
- User stories, edge cases, and acceptance criteria belong in SPEC.md only — never in feature docs

---

## Implementation Order

3 phases — see `docs/implementation-phases.md` for full checklist.

**Critical path**: Foundation + Auth → Daily Log → Weight Smoothing → Dashboard → Goals → Progress Intelligence → Insights → Integrations

---

## Reference Docs Index

| File | Contents |
|------|----------|
| `docs/README.md` | Module overview + design decisions |
| `docs/tech-stack.md` | Dependencies, env vars, setup commands |
| `docs/folder-structure.md` | Full directory tree with annotations |
| `docs/database-schema.md` | Complete Prisma schema |
| `docs/business-rules.md` | Algorithms: EMA, confidence, fat loss, hydration correction |
| `docs/api-routes.md` | All endpoints with request/response shapes |
| `docs/implementation-phases.md` | Build order with task checklists |
| `docs/features/01-*.md` through `06-*.md` | Per-module product briefs |
