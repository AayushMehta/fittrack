# Implementation Phases

Master build plan for FitTrack. Tasks are ordered by dependency. All algorithm logic requires unit tests first (TDD).

---

## Critical Path

```
Foundation → Auth → Daily Log → Weight Smoothing → Dashboard → Goals
  → Confidence Score → Fat Loss Estimation → Progress Charts
  → Plateau Detection → Insights → Weekly Metrics
  → [Phase 3] Device Integrations → Decision Engine
```

---

## Phase 1 — Foundation & Daily Tracking

**Goal**: Users can register, log in, enter daily fitness data, and see a smoothed weight trend on the dashboard.

### Layer 1: Project Foundation
**Depends on**: nothing

- [ ] `prisma/schema.prisma` — 5 models + WorkoutType enum + migration
- [ ] `src/lib/prisma.ts` — Prisma client singleton
- [ ] `src/lib/env.ts` — Zod-validated environment variables
- [ ] `src/lib/api.ts` — `api()` fetch helper + `ApiError` class
- [ ] `src/test/setup.ts` — Vitest global setup
- [ ] `prisma/seed.ts` — demo user seed

### Layer 2: Auth
**Depends on**: Layer 1

- [ ] `src/lib/auth.config.ts` — Edge-compatible NextAuth config
- [ ] `src/lib/auth.ts` — Full NextAuth config with credentials provider + bcrypt
- [ ] `src/middleware.ts` — Protect all dashboard routes
- [ ] `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- [ ] `src/lib/schemas/auth.schema.ts` — Register/login Zod schemas
- [ ] `src/app/api/auth/register/route.ts` — User registration (8 unit, 4 API)
- [ ] `src/app/(auth)/login/` — Login page + `LoginForm` component
- [ ] `src/app/(auth)/register/` — Register page + `RegisterForm` component (6 E2E)

### Layer 3: Daily Log
**Depends on**: Layer 2

- [ ] `src/lib/schemas/log.schema.ts` — `createLogSchema`, `updateLogSchema` with all field validations (12 unit)
- [ ] `src/lib/services/log.service.ts` — `createLog`, `getLogByDate`, `listLogs`, `getLatestLog` (14 service)
- [ ] `src/app/api/logs/route.ts` — GET list, POST create (8 API)
- [ ] `src/app/api/logs/[date]/route.ts` — GET by date, PUT correction (6 API)
- [ ] `src/app/(dashboard)/log/` — Log entry page + `DailyLogForm` + `LogHistory` (8 E2E)

### Layer 4: Weight Smoothing Engine
**Depends on**: Layer 3

- [ ] `src/lib/algorithms/ema.ts` — `computeEMA(entries)` with seeding logic (10 unit)
- [ ] `src/lib/algorithms/rolling-avg.ts` — `computeRollingAvg(entries, window)` (6 unit)
- [ ] `src/lib/services/computed.service.ts` — `recomputeForDate`, `getComputedRange` (10 service)
- [ ] `src/app/api/computed/route.ts` + `src/app/api/computed/[date]/route.ts` (6 API)
- [ ] Integrate recompute trigger into `POST /api/logs`

### Layer 5: Goals
**Depends on**: Layer 2

- [ ] `src/lib/schemas/goals.schema.ts` — `upsertGoalSchema` (6 unit)
- [ ] `src/lib/services/goals.service.ts` — `getGoals`, `upsertGoals` (6 service)
- [ ] `src/app/api/goals/route.ts` — GET + PUT (4 API)
- [ ] `src/app/(dashboard)/goals/` — Goals page + `GoalForm` (4 E2E)

### Layer 6: Dashboard
**Depends on**: Layers 3, 4, 5

- [ ] `src/lib/services/dashboard.service.ts` — `getDashboardSummary` (8 service)
- [ ] `src/app/api/dashboard/summary/route.ts` (4 API)
- [ ] `src/app/(dashboard)/dashboard/` — Overview panel + `WeeklyTrendWidget` + 7-day sparkline chart (6 E2E)
- [ ] `src/components/providers/QueryProvider.tsx` — TanStack Query singleton
- [ ] `src/components/layout/` — `Sidebar`, `Header`, `MobileNav`

**Done when**: A user can register, log 7+ days of weight, and see their smoothed weight trend and EMA on the dashboard.

---

## Phase 2 — Progress Intelligence & Insights

**Goal**: Users see physiologically-corrected body composition trends, confidence scores, plateau alerts, and behavior insights.

### Tasks

- [ ] `src/lib/algorithms/confidence.ts` — `computeConfidenceScore(log, goals, recentLogs)` (12 unit)
- [ ] `src/lib/algorithms/fat-loss.ts` — `estimateFatLoss(logs, goals)`, `reconstructBodyComposition(logs, computedMetrics)` (14 unit)
- [ ] `src/lib/algorithms/hydration.ts` — `correctBiaFatPct(rawFatPct, bodyWaterPct)` (8 unit)
- [ ] `src/lib/algorithms/plateau.ts` — `detectPlateau(computedMetrics)` (6 unit)
- [ ] `src/lib/algorithms/alerts.ts` — `generateAlerts(metrics, logs, goals)` — all alert types (14 unit)
- [ ] Update `computed.service.ts` — integrate all algorithms into recompute pipeline (10 service)
- [ ] `src/lib/services/progress.service.ts` — `getWeightTrend`, `getBodyCompositionTrend` (8 service)
- [ ] `src/app/api/progress/weight-trend/route.ts` + `body-composition/route.ts` (6 API)
- [ ] `src/lib/schemas/weekly.schema.ts` — `createWeeklySchema` (6 unit)
- [ ] `src/lib/services/weekly.service.ts` — `createOrUpdateWeekly`, `listWeekly` (8 service)
- [ ] `src/app/api/weekly/route.ts` + `[weekStart]/route.ts` (6 API)
- [ ] `src/lib/services/insights.service.ts` — `getInsightsSummary` (8 service)
- [ ] `src/app/api/insights/route.ts` (4 API)
- [ ] `src/app/(dashboard)/progress/` — `WeightTrendChart`, `BodyCompositionChart`, `WeeklyMetricForm` (8 E2E)
- [ ] `src/app/(dashboard)/insights/` — `AdherenceSummary`, `AlertsList` (6 E2E)

**Done when**: Users see confidence scores, true fat%, estimated lean mass, plateau alerts, and a breakdown of protein/workout/step adherence on the Insights page.

---

## Phase 3 — Settings, Polish & Integrations

**Goal**: Account management, UI polish, and groundwork for device integrations.

### Group A: Settings & Account

- [ ] `src/lib/services/user.service.ts` — `updateProfile`, `changePassword`, `deleteAccount` (8 service)
- [ ] `src/app/api/settings/profile/route.ts`, `password/route.ts`, `account/route.ts` (6 API)
- [ ] `src/lib/s3.ts` — S3 client + `generatePresignedUploadUrl` (4 unit)
- [ ] `src/app/api/upload/progress-photo/route.ts` (4 API)
- [ ] `src/app/(dashboard)/settings/` — `ProfileForm`, `PasswordForm`, account deletion (4 E2E)

### Group B: Device Integration Groundwork

- [ ] Integration layer design — MCP adapter interface for wearable data ingestion
- [ ] `DeviceData` model in schema (if needed) — normalized device readings
- [ ] Apple Health import endpoint (CSV/JSON export parsing)
- [ ] Fitbit webhook receiver

**Done when**: Users can manage their account and optionally connect a wearable for automatic step and body composition data.
