# Spec: Progress Intelligence

**Phase**: 2
**Routes**: `/progress`, `/api/progress/weight`, `/api/progress/body-composition`, `/api/weekly`, `/api/weekly/[weekStart]`
**Access**: Authenticated users only

**Files**:
- `src/app/(app)/progress/page.tsx` -- Server component; renders heading and `ProgressClient`
- `src/app/(app)/progress/progress-client.tsx` -- Client component; weight trend chart, body composition chart, date range selector
- `src/app/api/progress/weight/route.ts` -- API handler for GET weight trend data
- `src/app/api/progress/body-composition/route.ts` -- API handler for GET body composition data
- `src/app/api/weekly/route.ts` -- API handler for GET (list weekly metrics) and POST (upsert weekly metric)
- `src/lib/services/progress.ts` -- Service functions: `getWeightTrend`, `getBodyComposition`
- `src/lib/services/weekly.ts` -- Service functions: `upsertWeeklyMetric`, `listWeeklyMetrics`, `getWeeklyMetric`
- `src/lib/validations/weekly.ts` -- Zod validation schema: `weeklySchema`

---

## Overview

The Progress module visualizes body composition trends over configurable time ranges. It displays two primary charts: a weight trend chart showing raw weight, EMA, and 7-day rolling average; and a body composition chart showing true fat%, fat mass, and lean mass. The module also handles weekly metric entry (waist measurement, strength lifts) via the Weekly API endpoints.

---

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| PROG-1 | logged-in user | see my raw weight, EMA, and 7-day rolling average on a chart | I can distinguish noise from real trends |
| PROG-2 | logged-in user | select a date range (14d, 30d, 60d, 90d, all) for my charts | I can zoom in or out on my progress |
| PROG-3 | logged-in user | see my true fat%, fat mass, and lean mass over time | I can track body composition beyond just weight |
| PROG-4 | logged-in user | log weekly measurements (waist, strength lifts) | I have a comprehensive picture of my progress |
| PROG-5 | logged-in user | see an empty state when no data exists | I know I need to start logging |

---

## Happy Flow -- Viewing Weight Trend

1. User navigates to `/progress`
2. Client component mounts with default 30-day range
3. `useQuery` fetches GET `/api/progress/weight?days=30`
4. API merges `DailyLog` weights with `ComputedMetric` EMA/rolling avg by date
5. Chart renders: grey dots for raw weight, indigo line for EMA, green dashed line for 7d avg
6. User selects "90d" from date range selector
7. Chart re-fetches and updates with 90-day data

## Happy Flow -- Viewing Body Composition

1. `useQuery` fetches GET `/api/progress/body-composition?days=30` in parallel with weight trend
2. API returns `ComputedMetric` entries where `trueFatPct` is not null
3. Chart renders: orange line for true fat% (left Y-axis, %), indigo line for lean mass (right Y-axis, kg), red dashed line for fat mass (right Y-axis, kg)
4. If no BIA data exists, empty state message is shown

## Happy Flow -- Submitting Weekly Metric

1. Client sends POST `/api/weekly` with `weekStartDate`, `waistCm`, and lift data
2. API validates via `weeklySchema`, upserts `WeeklyMetric` row
3. API fires `recomputeMetrics` for today
4. Returns 201 with the created/updated metric

---

## Form Fields

### Weekly Metric Form

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| weekStartDate | string | Yes | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` | Must be YYYY-MM-DD format |
| waistCm | number | No | `z.number().positive().optional()` | Waist circumference in cm |
| benchPressPeak | number | No | `z.number().positive().optional()` | Heaviest bench press this week in kg |
| squatPeak | number | No | `z.number().positive().optional()` | Heaviest squat this week in kg |
| deadliftPeak | number | No | `z.number().positive().optional()` | Heaviest deadlift this week in kg |
| otherStrengthNotes | string | No | `z.string().max(500).optional()` | Free-text notes, max 500 characters |

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| User has no DailyLog entries | Weight trend chart shows empty state: "No data yet. Start logging your weight." |
| User has no BIA data (no bodyFatPct or bodyWaterPct logged) | Body composition chart shows empty state: "Log BIA readings (body fat %, body water %) to see body composition data." |
| User has 1 weight entry | Chart renders with a single dot for raw weight and a single EMA point; no line drawn |
| User has fewer than 7 entries | Rolling 7d avg line has no data points (all null); EMA and raw weight lines render normally |
| Null `trueFatPct` in ComputedMetric | Body composition query filters these out (`trueFatPct: { not: null }`) |
| Null `estimatedLeanMass` or `estimatedFatMass` | Passed as null in response; chart line skips those points via `connectNulls` |
| Days param exceeds 365 | Clamped to 365 via `Math.min(Number(...), 365)` |
| Days param is negative or NaN | Parsed as NaN, clamped to 365; effectively returns all data up to 365 days |
| Unauthenticated request to GET /api/progress/weight | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to GET /api/progress/body-composition | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to GET /api/weekly | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to POST /api/weekly | Returns 401 `{ "error": "Unauthorized" }` |
| Weekly metric with invalid date format | Returns 400 with Zod validation error |
| Weekly metric with negative waistCm | Returns 400; `z.number().positive()` rejects it |
| Weekly metric with otherStrengthNotes > 500 chars | Returns 400; `z.string().max(500)` rejects it |

---

## Acceptance Criteria

- [x] GET `/api/progress/weight` returns merged raw weight + EMA + rolling 7d avg data for the requested day range
- [x] GET `/api/progress/body-composition` returns `trueFatPct`, `fatMass`, `leanMass`, and `confidence` only for dates where `trueFatPct` is not null
- [x] Both progress API endpoints return 401 when no valid session
- [x] Date range selector offers 14d, 30d, 60d, 90d, and All (365d) options
- [x] Weight trend chart renders three lines: raw weight (grey dots), EMA (indigo solid), 7d avg (green dashed)
- [x] Body composition chart renders three lines: true fat% (orange, left axis), lean mass (indigo, right axis, kg), fat mass (red dashed, right axis, kg)
- [x] Empty state for weight chart shows "No data yet. Start logging your weight."
- [x] Empty state for body composition chart shows "Log BIA readings (body fat %, body water %) to see body composition data."
- [x] No computed value (trueFatPct, estimatedLeanMass, estimatedFatMass) has an edit control -- all are display-only
- [x] Null ComputedMetric fields are passed as null in the API response, never as 0
- [x] GET `/api/weekly` returns list of weekly metrics ordered by `weekStartDate` descending
- [x] POST `/api/weekly` upserts a `WeeklyMetric` row and triggers `recomputeMetrics`
- [x] POST `/api/weekly` validates via `weeklySchema` and returns 400 on invalid input

---

## UI/UX

### Progress Page (`/progress`)

**Layout**: Full-width, vertical stack with `space-y-6`. Heading "Progress" at top.

**Weight Trend Chart Card**: Card with "Weight Trend" heading and date range selector (14d / 30d / 60d / 90d / All pills). Loading indicator shown while fetching. Recharts `LineChart` with three lines: Raw (grey, thin, with dots), EMA (indigo, thick, no dots), 7d avg (green, medium, dashed, no dots). Chart height 260px. Empty state centered message when no data.

**Body Composition Chart Card**: Card with "Body Composition" heading. Dual Y-axes: left for % (fat%), right for kg (lean/fat mass). Three lines: true fat% (orange), lean mass (indigo), fat mass (red dashed). Empty state centered message when no BIA data.

**States**:
- **Loading**: "Loading..." text shown next to date range selector
- **Empty (no weight data)**: "No data yet. Start logging your weight."
- **Empty (no BIA data)**: "Log BIA readings (body fat %, body water %) to see body composition data."
- **Populated**: Both charts rendered with data

---

## Algorithm Rules

### Hydration Correction (displayed on body composition chart)

**Source**: `src/lib/algorithms/body-composition.ts`
**Doc reference**: `docs/business-rules.md #5`

**Formula**:
```
deviation = bodyWaterPct - 60
correctionFactor = deviation x 0.5
trueFatPct = rawBiaFatPct - correctionFactor
```

**Null handling**: Returns null if either `biaFatPct` or `bodyWaterPct` is null
**Bounds**: `trueFatPct` is floored at 0 via `Math.max(0, ...)`

### Fat Mass and Lean Mass

**Source**: `src/lib/algorithms/body-composition.ts`

**Formulas**:
```
estimatedFatMass = weightKg x (fatPct / 100)
estimatedLeanMass = weightKg x (1 - fatPct / 100)
```

**Null handling**: Both return null if `fatPct` is null

---

## Zod Schema (`src/lib/validations/weekly.ts`)

```ts
import { z } from 'zod'

export const weeklySchema = z.object({
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  waistCm: z.number().positive().optional(),
  benchPressPeak: z.number().positive().optional(),
  squatPeak: z.number().positive().optional(),
  deadliftPeak: z.number().positive().optional(),
  otherStrengthNotes: z.string().max(500).optional(),
})

export type WeeklyInput = z.infer<typeof weeklySchema>
```

---

## API Contract

### GET /api/progress/weight

**Purpose**: Fetch raw weight + EMA + rolling 7d average for charting
**Auth**: Required (session)

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days | number | No | Number of days to look back, default 30, max 365 |

**Response -- 200 OK**
```json
{
  "data": [
    {
      "date": "2026-03-01",
      "weight": 79.2,
      "ema": 79.0,
      "rolling7d": 79.1
    }
  ]
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

### GET /api/progress/body-composition

**Purpose**: Fetch body composition trend (fat%, fat mass, lean mass) for charting
**Auth**: Required (session)

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days | number | No | Number of days to look back, default 30, max 365 |

**Response -- 200 OK**
```json
{
  "data": [
    {
      "date": "2026-03-01",
      "trueFatPct": 17.8,
      "fatMass": 13.9,
      "leanMass": 64.2,
      "confidence": 74.2
    }
  ]
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

### GET /api/weekly

**Purpose**: List weekly metrics for the authenticated user
**Auth**: Required (session)

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| limit | number | No | Max results to return, default 12 |

**Response -- 200 OK**
```json
{
  "data": [
    {
      "id": "cuid",
      "userId": "cuid",
      "weekStartDate": "2026-03-23T00:00:00.000Z",
      "waistCm": 84.5,
      "benchPressPeak": 80,
      "squatPeak": 100,
      "deadliftPeak": 120,
      "otherStrengthNotes": "New PR on deadlift",
      "createdAt": "2026-03-23T10:00:00.000Z",
      "updatedAt": "2026-03-23T10:00:00.000Z"
    }
  ]
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

### POST /api/weekly

**Purpose**: Create or update a weekly metric entry (upsert by userId + weekStartDate)
**Auth**: Required (session)

**Request**
```json
{
  "weekStartDate": "2026-03-23",
  "waistCm": 84.5,
  "benchPressPeak": 80,
  "squatPeak": 100,
  "deadliftPeak": 120,
  "otherStrengthNotes": "New PR on deadlift"
}
```

**Response -- 201 Created**
```json
{
  "data": {
    "id": "cuid",
    "userId": "cuid",
    "weekStartDate": "2026-03-23T00:00:00.000Z",
    "waistCm": 84.5,
    "benchPressPeak": 80,
    "squatPeak": 100,
    "deadliftPeak": 120,
    "otherStrengthNotes": "New PR on deadlift",
    "createdAt": "2026-03-23T10:00:00.000Z",
    "updatedAt": "2026-03-23T10:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |
| 400 | Zod validation failed | `{ "error": "Invalid input", "details": { ... } }` |
| 500 | Unexpected server error | `{ "error": "Internal server error" }` |

---

## Test Scenarios

### Unit Tests (`src/__tests__/validations/weekly.test.ts`)

Verified count = 6

| Test | Assertion |
|------|-----------|
| Accepts valid input with only weekStartDate | Parse succeeds |
| Rejects missing weekStartDate | Parse fails |
| Rejects invalid date format | Parse fails |
| Accepts all optional fields when valid | Parse succeeds |
| Rejects negative waistCm | Parse fails |
| Rejects negative lift value | Parse fails |

### Service Tests

No dedicated service tests for `progress.ts` or `weekly.ts`.

Verified count = 0

### API Tests

No dedicated API tests for progress or weekly routes.

Verified count = 0

### E2E Tests

No E2E tests (Playwright excluded).

---

## Deferred / Out of Scope

| Item | Reason | Future Phase |
|------|--------|--------------|
| WeeklyMetricForm on /progress page | Feature doc describes form on progress page; not implemented in current UI (form is API-only) | TBD |
| ProgressPhotoGallery | Feature doc mentions photo gallery; S3 skipped in simplified stack | TBD |
| DeficitVsFatLossChart | Feature doc mentions bar chart comparing deficit to fat loss; not implemented | TBD |
| Strength trend mini charts | Feature doc mentions line charts per lift; not implemented | TBD |
| Progress photo upload (POST /api/upload/progress-photo) | S3 skipped in simplified stack | TBD |
| GET /api/weekly/[weekStart] route | Not implemented as a route file; service function `getWeeklyMetric` exists but no route | TBD |
| PUT /api/weekly/[weekStart] route | Not implemented | TBD |
| Monday validation for weekStartDate | Feature doc says weekStartDate must be a Monday; not enforced by Zod or service | TBD |
| Service-level and API-level tests | No test files for progress or weekly | TBD |

---

## Dependencies

- Phase 1 must be complete (Daily Log, Weight Smoothing, Goals)
- `ComputedMetric` model must contain EMA, rolling avg, and body composition data
- Recharts library for chart rendering
- TanStack Query for client-side data fetching
