# Spec: Dashboard

**Phase**: 1
**Routes**: `/dashboard`, `/api/dashboard`
**Access**: Authenticated users only -- redirects to /login if no session

**Files**:
- `src/app/(app)/dashboard/page.tsx` -- Server component; fetches dashboard data via `getDashboardData`, passes to `DashboardClient`
- `src/app/(app)/dashboard/dashboard-client.tsx` -- Client component; KPI cards, weight chart, confidence breakdown, alerts, today's adherence
- `src/app/api/dashboard/route.ts` -- API handler for GET dashboard summary
- `src/lib/services/dashboard.ts` -- Service function: `getDashboardData`

---

## Overview

The Dashboard is the first screen users see after login. It provides a read-only overview of the user's current body composition status: EMA-smoothed weight, true fat%, lean mass, confidence score, weight trend chart, today's adherence rings, and active alerts. No data entry occurs on the dashboard -- users are directed to `/log` for that.

---

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| DASH-1 | logged-in user | see my current EMA weight, true fat%, lean mass, and confidence score at a glance | I know my current body composition state |
| DASH-2 | logged-in user | see a weight trend chart (raw, EMA, 7d avg) for a selectable date range | I can observe my weight trajectory over time |
| DASH-3 | logged-in user | see today's adherence (calories, protein, steps vs goals) | I know if I am on track today |
| DASH-4 | logged-in user | see active alerts (plateau, muscle loss risk, etc.) | I can take corrective action |
| DASH-5 | logged-in user | be prompted to log today if I have not yet | I maintain my logging streak |
| DASH-6 | new user with no data | see an empty state directing me to /log | I know what to do first |

---

## Happy Flow -- Returning User with Data

1. User navigates to `/dashboard` (or is redirected here after login)
2. Server component calls `auth()`, verifies session, redirects to `/login` if none
3. Server calls `getDashboardData(userId)` which fetches today's log, today's metric, goals, recent metrics (30d), latest log, and recent raw weights
4. Data passed as `initialData` prop to `DashboardClient`
5. Client renders: date range selector (default 30d), KPI cards (EMA weight, raw weight, true fat%, lean mass, confidence), weight chart, today's adherence rings, confidence breakdown, and alert cards
6. User changes date range to 7d or 14d; `useQuery` fetches from `/api/dashboard?days=7`
7. Chart and KPI deltas update to reflect the selected range

## Happy Flow -- New User (Empty State)

1. User navigates to `/dashboard`
2. `getDashboardData` returns null metrics, empty chart data, `todayLogged = false`
3. Client renders empty state with dashed border and "Log your first entry" CTA link to `/log`

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| User has no data at all | Empty state shown with "No entries yet" message and link to /log; no chart rendered; KPI values show "--" |
| User has data but not today | Log nudge banner shown ("No entry today yet -- keep your streak going!") with "Log now" link; KPI cards show latest available values |
| Chart data has 0 data points | Chart section not rendered (guarded by `data.chartData.length > 0`) |
| Chart data has 1 data point | Chart renders with a single dot; EMA delta returns null (needs 2+ points); no delta badge shown |
| Null `emaWeight` | KPI card shows "--" (via `value ?? '--'` pattern) |
| Null `trueFatPct` | KPI card shows "--" |
| Null `confidenceScore` | KPI card shows "--"; confidence breakdown shows "--" for overall; sub-scores prompt "Set goals to unlock score breakdown" |
| Null `estimatedLeanMass` | KPI card shows "--" |
| No `UserGoal` exists | Goal is null; today's adherence section shows "Log today or set goals to see adherence"; confidence sub-scores show 0 bars |
| Unauthenticated request to GET /api/dashboard | Returns 401 `{ "error": "Unauthorized" }` |
| Invalid `days` query param (e.g. days=45) | Defaults to 30 (only 7, 14, 30 are accepted) |
| No ComputedMetric for today | `todayMetric` is null; all computed values default to null |

---

## Acceptance Criteria

- [x] GET `/api/dashboard` returns 401 when no valid session
- [x] GET `/api/dashboard` accepts `days` query param (7, 14, or 30); defaults to 30 for unrecognized values
- [x] Dashboard shows 5 KPI cards: EMA Weight, Raw Weight, True Fat %, Lean Mass, Confidence
- [x] Null computed values display as "--" (dash), never as "0" or blank
- [x] No computed value (EMA, trueFatPct, confidenceScore, estimatedLeanMass) has an edit control -- all are display-only
- [x] Weight chart shows EMA line (indigo), raw weight dots (slate), 7d avg dashed line (green) with toggleable visibility
- [x] Weight chart renders a target weight reference line when `UserGoal.targetWeight` is set
- [x] Empty state is shown when `chartData` is empty and `todayLogged` is false
- [x] Log nudge banner is shown when `todayLogged` is false (but data exists)
- [x] Today's adherence section shows ring progress for calories, protein, and steps vs goal targets
- [x] Confidence breakdown shows protein, training, and activity sub-scores as horizontal bars
- [x] Alerts are rendered as styled cards with severity-based colors (critical=red, warning=amber, info=blue)
- [x] Date range selector allows switching between 7d, 14d, and 30d views; data re-fetches via TanStack Query
- [x] SSR data is used as `initialData` for the default 30d view to avoid loading flash

---

## UI/UX

### Dashboard Page (`/dashboard`)

**Layout**: Full-width, vertical stack of sections with `space-y-5`.

**Row 1 -- Header**: "Dashboard" title + date range selector (7d / 14d / 30d pills). Loading indicator shown while fetching.

**Row 2 -- Log nudge** (conditional): Amber banner with "No entry today yet" message and "Log now" link when `todayLogged` is false.

**Row 3 -- KPI Cards**: 5-column grid (2-col on mobile). Each card shows label, value with unit, and optional delta badge (green for weight loss, red for weight gain). Cards: EMA Weight (highlighted with ring), Raw Weight, True Fat %, Lean Mass, Confidence (/100).

**Row 4 -- Weight Chart**: Recharts `LineChart` inside a card. Three toggleable lines (EMA, Raw, 7d avg). Optional target weight reference line. Chart only renders when data exists.

**Row 5 -- Two-column grid**: Left card shows "Today" with ring progress indicators for Calories, Protein, Steps. Right card shows "Confidence Score" with overall score and 3 sub-score horizontal bars.

**Row 6 -- Alerts**: Grid of alert cards with severity-based styling. Only shown when alerts array is non-empty.

**Empty state**: Centered dashed-border box with "No entries yet" and CTA button to `/log`.

**Loading state**: Skeleton placeholders (5 pulsing rectangles) for KPI cards while data loads.

---

## Zod Schema

No dedicated Zod schema file for dashboard. The API route has no request body validation (GET-only with query params).

The `days` query param is validated inline:
```ts
const rawDays = parseInt(searchParams.get('days') ?? '30', 10)
const days = [7, 14, 30].includes(rawDays) ? rawDays : 30
```

---

## API Contract

### GET /api/dashboard

**Purpose**: Fetch all data needed for the dashboard overview panel
**Auth**: Required (session)

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days | number | No | Date range: 7, 14, or 30. Defaults to 30 |

**Response -- 200 OK**
```json
{
  "data": {
    "currentWeight": 78.4,
    "emaWeight": 78.1,
    "confidenceScore": 74.2,
    "trueFatPct": 17.8,
    "leanMass": 64.2,
    "proteinScore": 92.0,
    "trainingScore": 67.0,
    "activityScore": 62.0,
    "alerts": [
      { "type": "PLATEAU", "message": "Weight has barely moved...", "severity": "warning" }
    ],
    "chartData": [
      { "date": "2026-03-01", "ema": 79.0, "rolling7d": 79.1, "rawWeight": 79.2 }
    ],
    "todayLogged": true,
    "today": {
      "steps": 9234,
      "caloriesIntake": 2100,
      "proteinIntake": 165,
      "workedOut": true
    },
    "goal": {
      "targetWeight": 74.0,
      "targetBodyFatPct": 14.0,
      "dailyProteinTarget": 175,
      "dailyCalorieTarget": 2200,
      "dailyStepsTarget": 9000,
      "weeklyWorkoutTarget": 4
    }
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

## Test Scenarios

### Unit Tests

No dedicated unit tests for dashboard logic (computations happen in algorithm files).

### Service Tests

No dedicated service tests for `dashboard.ts`.

Verified count = 0

### API Tests

No dedicated API tests for `/api/dashboard`.

Verified count = 0

### E2E Tests

No E2E tests (Playwright excluded).

---

## Deferred / Out of Scope

| Item | Reason | Future Phase |
|------|--------|--------------|
| Dismissible alerts | Feature doc mentions dismissible alert banners; current implementation renders non-dismissible cards | TBD |
| ConfidenceBar hover breakdown | Feature doc mentions sub-score breakdown on hover; implemented as always-visible side panel instead | N/A |
| WeeklyEmaDelta display | API docs specify `weeklyEmaDelta`; current implementation calculates range delta dynamically from chart data | N/A |
| Dashboard service tests | No test coverage for `getDashboardData` | TBD |
| Dashboard API tests | No test coverage for `/api/dashboard` route | TBD |

---

## Dependencies

- Phase 1 Layers 1-5 must be complete (Auth, Daily Log, Weight Smoothing, Goals)
- `src/lib/services/dashboard.ts` reads from `DailyLog`, `ComputedMetric`, and `UserGoal` models
- Chart rendering requires Recharts library
- TanStack Query for client-side data fetching with date range switching
