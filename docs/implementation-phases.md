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

- [x] `prisma/schema.prisma` — 5 models + WorkoutType enum + migration
- [x] `src/lib/db.ts` — Prisma client singleton (plan listed as prisma.ts)
- [x] `src/lib/env.ts` — Zod-validated environment variables
- [x] `src/lib/api.ts` — `api()` fetch helper + `ApiError` class (9 unit tests ✅)
- [x] `src/test/setup.ts` — Vitest global setup
- [x] `prisma/seed.ts` — demo user seed (demo@fittrack.app / demo1234, 21 days of data)

### Layer 2: Auth
**Depends on**: Layer 1

- [x] `src/lib/auth.config.ts` — Edge-compatible NextAuth config
- [x] `src/lib/auth.ts` — Full NextAuth config with credentials provider + bcrypt
- [x] `src/middleware.ts` — Protect all dashboard routes
- [x] `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- [x] `src/lib/validations/daily-log.ts` — Daily log Zod schemas (plan listed under log.schema.ts)
- [x] `src/app/api/auth/register/route.ts` — User registration
- [x] `src/app/(auth)/login/` — Login page + `LoginForm` component
- [x] `src/app/(auth)/register/` — Register page + `RegisterForm` component

### Layer 3: Daily Log
**Depends on**: Layer 2

- [x] `src/lib/validations/daily-log.ts` — `createLogSchema` with all field validations
- [x] `src/lib/services/daily-log.ts` — `createLog`, `getLogByDate`, `getLogs`
- [x] `src/app/api/logs/route.ts` — GET list, POST create
- [x] `src/app/api/logs/[date]/route.ts` — GET by date, PUT correction
- [x] `src/app/(app)/log/` — Log entry page + `DailyLogForm` + log history

### Layer 4: Weight Smoothing Engine
**Depends on**: Layer 3

- [x] `src/lib/algorithms/ema.ts` — `calcEMA(entries)` with seeding logic (5 unit tests)
- [x] `src/lib/algorithms/rolling-average.ts` — `calcRollingAvg7d(entries)` (4 unit tests)
- [x] `src/lib/services/computed.ts` — `recomputeMetrics`, `getComputedRange`
- [x] Integrate recompute trigger into `POST /api/logs` (fire-and-forget)
- [x] `src/app/api/computed/route.ts` — not needed (recompute is server-side only, fire-and-forget from log/goal/weekly routes)

### Layer 5: Goals
**Depends on**: Layer 2

- [x] `src/lib/validations/goal.ts` — `goalSchema`
- [x] `src/lib/services/goal.ts` — `getGoal`, `upsertGoal`
- [x] `src/app/api/goals/route.ts` — GET + PUT
- [x] `src/app/(app)/goals/` — Goals page + `GoalsClient` with live gap preview

### Layer 6: Dashboard
**Depends on**: Layers 3, 4, 5

- [x] `src/lib/services/dashboard.ts` — `getDashboardData`
- [x] `src/app/api/dashboard/route.ts` — GET dashboard summary
- [x] `src/app/(app)/dashboard/` — Overview panel + `WeeklyTrendWidget` + 7-day sparkline chart
- [x] `src/components/providers.tsx` — TanStack Query singleton
- [x] `src/components/layout/app-nav.tsx` — Sidebar + navigation

**Done when**: A user can register, log 7+ days of weight, and see their smoothed weight trend and EMA on the dashboard. ✅

---

## Phase 2 — Progress Intelligence & Insights

**Goal**: Users see physiologically-corrected body composition trends, confidence scores, plateau alerts, and behavior insights.

### Tasks

- [x] `src/lib/algorithms/confidence.ts` — `calcSubScore`, `calcConfidence` (6 unit tests)
- [x] `src/lib/algorithms/body-composition.ts` — `calcTrueFatPct`, `calcFatMass`, `calcLeanMass` + hydration correction (plan listed as fat-loss.ts + hydration.ts)
- [x] `src/lib/algorithms/alerts.ts` — `generateAlerts` — plateau, fat loss, muscle loss, protein alerts (8 unit tests)
- [x] Update `src/lib/services/computed.ts` — integrate all algorithms into recompute pipeline
- [x] `src/lib/services/progress.ts` — `getWeightTrend`, `getBodyComposition`
- [x] `src/app/api/progress/weight/route.ts` + `body-composition/route.ts`
- [x] `src/lib/validations/weekly.ts` — `weeklySchema` (6 unit tests ✅)
- [x] `src/lib/services/weekly.ts` — `upsertWeeklyMetric`, `listWeeklyMetrics`, `getWeeklyMetric`
- [x] `src/app/api/weekly/route.ts` + `[weekStart]/route.ts`
- [x] `src/lib/services/insights.ts` — `getInsights`
- [x] `src/app/api/insights/route.ts`
- [x] `src/app/(app)/progress/` — `WeightTrendChart`, `BodyCompositionChart` with date-range selector
- [x] `src/app/(app)/insights/` — `AdherenceSummary`, `AlertsList`, streak counter

**Done when**: Users see confidence scores, true fat%, estimated lean mass, plateau alerts, and a breakdown of protein/workout/step adherence on the Insights page. ✅

---

## Phase 3 — Settings, Polish & Integrations (DONE)

**Goal**: Account management, UI polish, and groundwork for device integrations.

### Group A: Settings & Account

- [x] `src/lib/services/settings.ts` — `updateProfile`, `updatePassword`, `deleteAccount`
- [x] `src/app/api/settings/profile/route.ts` — PUT update profile
- [x] `src/app/api/settings/password/route.ts` — PUT change password
- [x] `src/app/api/settings/account/route.ts` — DELETE account
- [x] `src/lib/s3.ts` — SKIPPED (no S3 in simplified stack)
- [x] `src/app/api/upload/progress-photo/route.ts` — SKIPPED (no S3 in simplified stack)
- [x] `src/app/(app)/settings/` — `ProfileForm`, `PasswordForm`, account deletion with confirmation

### Group B: AI Insights Sidebar (added)

- [x] `src/lib/ai/context.ts` — `buildAIContext` — assembles 30-day user snapshot for Claude
- [x] `src/lib/ai/prompts.ts` — `buildPrompt` — mode-specific prompts (weekly, root-cause, recommendations, narrative)
- [x] `src/app/api/ai/analyze/route.ts` — POST streaming endpoint using `@anthropic-ai/sdk`
- [x] `src/components/ai/AISidebar.tsx` — streaming AI sidebar with mode selector + regenerate
- [x] `src/lib/env.ts` — added `ANTHROPIC_API_KEY` validation

### Group C: Device Integration Groundwork

- [x] `src/lib/devices/adapter.ts` — `DeviceAdapter` interface + `ImportResult` type (no TDD — types only)
- [x] `DeviceData` model in schema — skipped; `DailyLog` covers all device-provided fields
- [x] `src/lib/devices/apple-health.ts` — Apple Health JSON array adapter (7 unit tests ✅)
- [x] `src/app/api/import/apple-health/route.ts` — POST import endpoint
- [x] `src/lib/devices/fitbit.ts` — HMAC-SHA1 signature verification + notification parsing (8 unit tests ✅)
- [x] `src/app/api/webhooks/fitbit/route.ts` — GET verification challenge + POST webhook handler (7 unit tests ✅)
- [x] `src/lib/env.ts` — added optional `FITBIT_CLIENT_SECRET` + `FITBIT_SUBSCRIBER_VERIFICATION_CODE`
- [x] E2E tests — SKIPPED (Playwright excluded from simplified stack)

**Done when**: Users can manage their account, access AI-powered fitness analysis, and optionally connect a wearable for automatic step and body composition data. ✅
