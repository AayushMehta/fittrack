# Spec: Daily Logging

**Phase**: 1
**Routes**: `/log`, `/api/logs`, `/api/logs/[date]`
**Access**: Authenticated users only -- redirects to /login if no session

**Files**:
- `src/app/(app)/log/page.tsx` -- Server component; fetches today's existing log via `getLogByDate`, passes to `DailyLogClient`
- `src/app/(app)/log/daily-log-client.tsx` -- Client component; React Hook Form daily log form with all field sections
- `src/app/api/logs/route.ts` -- API handler for GET (list logs) and POST (create log)
- `src/app/api/logs/[date]/route.ts` -- API handler for GET (log by date) and PUT (correction entry)
- `src/lib/services/daily-log.ts` -- Service functions: `createLog`, `getLogByDate`, `getLogs`
- `src/lib/validations/daily-log.ts` -- Zod validation schema: `dailyLogSchema`
- `src/lib/services/computed.ts` -- `recomputeMetrics` called after every log save

---

## Overview

The Daily Log is the primary data entry point for FitTrack. Users record their morning fasted weight plus optional nutrition, activity, body composition (BIA), and lifestyle data. Entries are immutable -- corrections create a new row for the same date rather than updating the original. Every log save triggers asynchronous recalculation of `ComputedMetric` for that date.

---

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| LOG-1 | logged-in user | log my morning weight and optional metrics for today | my smoothed weight trend and computed metrics are updated |
| LOG-2 | logged-in user | see whether I have already logged today when I visit /log | I know if I am creating a new entry or a correction |
| LOG-3 | logged-in user | submit a correction for today if I made a mistake | my data is accurate without losing the original entry |
| LOG-4 | logged-in user | log optional nutrition data (calories, protein, carbs, sodium) | FitTrack can compute my confidence score and fat loss estimate |
| LOG-5 | logged-in user | log optional BIA readings (body fat %, muscle mass, body water %) | FitTrack can apply hydration correction and track true body composition |
| LOG-6 | logged-in user | retrieve my past log entries by date range | I can review my history |

---

## Happy Flow -- First Entry of the Day

1. User navigates to `/log`
2. Server component checks for existing log for today via `getLogByDate(userId, today)` -- returns null
3. Form renders with empty fields (date pre-filled to today)
4. User fills in weight (required) and any optional fields
5. User submits form
6. Client sends POST `/api/logs` with form data
7. API validates via `dailyLogSchema`, creates `DailyLog` row, fires `recomputeMetrics` async
8. API returns 201 with the new `DailyLog` object
9. Client shows success toast "Entry saved!" and redirects to `/dashboard`

## Happy Flow -- Correction Entry

1. User navigates to `/log`
2. Server component finds existing log for today -- returns the entry
3. Form renders pre-filled with existing values; blue banner says "You already logged today. Submitting will create a correction entry (original is preserved)."
4. User modifies weight or other fields
5. User submits form
6. Client sends PUT `/api/logs/{date}` with updated data
7. API validates, creates a **new** `DailyLog` row (same date, newer `createdAt`), fires `recomputeMetrics`
8. API returns 201 with the new correction entry
9. Client shows success toast "Correction logged!" and redirects to `/dashboard`

## Happy Flow -- List Logs

1. Client sends GET `/api/logs?from=2026-03-01&to=2026-03-28&page=1&pageSize=30`
2. API validates session, queries `DailyLog` for the user within date range
3. API returns `{ data: DailyLog[], meta: { total, page, pageSize } }`

---

## Form Fields

### Daily Log Form

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| date | string | Yes | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` | Hidden field, defaults to today (YYYY-MM-DD) |
| weight | number | Yes | `z.number().positive()` | Morning fasted weight in kg, step 0.1 |
| steps | number | No | `z.number().int().nonnegative().optional()` | Integer step count |
| workedOut | boolean | No | `z.boolean().optional().default(false)` | Checkbox toggle, defaults to false |
| workoutType | string | No | `z.enum(['STRENGTH','CARDIO','HIIT','YOGA','SPORTS','OTHER']).optional()` | Only shown when workedOut is true |
| caloriesIntake | number | No | `z.number().int().nonnegative().optional()` | kcal |
| proteinIntake | number | No | `z.number().nonnegative().optional()` | grams, step 0.1 |
| carbIntake | number | No | `z.number().nonnegative().optional()` | grams, step 0.1 |
| sodiumIntake | number | No | `z.number().int().nonnegative().optional()` | mg |
| bodyFatPct | number | No | `z.number().min(1).max(70).optional()` | Raw BIA reading, 1-70% |
| skeletalMuscleMass | number | No | `z.number().nonnegative().optional()` | kg, step 0.1 |
| bodyWaterPct | number | No | `z.number().min(1).max(99).optional()` | 1-99% |
| sleepHours | number | No | `z.number().min(0).max(24).optional()` | step 0.5 |

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| User has no log entries yet | Form renders empty; no correction banner shown; POST creates first entry |
| User submits entry for a date that already has an entry via POST | API returns 409 with error "A log for this date already exists. Use PUT to create a correction." (Prisma P2002 unique constraint) |
| User submits correction via PUT for a date | New DailyLog row created with newer `createdAt`; original row untouched; `getLogByDate` returns newer entry |
| User submits entry without any optional fields | Entry saves with null for all optional fields; EMA computed from weight only; confidence sub-scores compute as 0 where inputs are null |
| User submits bodyFatPct without bodyWaterPct | Entry saves; `calcTrueFatPct` returns null (both inputs required for hydration correction) |
| User submits bodyWaterPct = 60.0 | No hydration correction applied; `trueFatPct = rawFatPct` |
| Unauthenticated request to GET /api/logs | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to POST /api/logs | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to GET /api/logs/[date] | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to PUT /api/logs/[date] | Returns 401 `{ "error": "Unauthorized" }` |
| GET /api/logs/[date] for a date with no entry | Returns 404 `{ "error": "Not found" }` |
| Invalid date format in request body (e.g. "03-28-2026") | Returns 400 with Zod validation error |
| Weight is 0 or negative | Returns 400; `z.number().positive()` rejects it |

---

## Acceptance Criteria

- [x] POST `/api/logs` creates a new `DailyLog` row and returns 201
- [x] POST `/api/logs` returns 409 when an entry for the same `(userId, date)` already exists
- [x] PUT `/api/logs/[date]` creates a NEW row (does not update the existing one) -- immutability enforced
- [x] After any DailyLog save (POST or PUT), `recomputeMetrics` is called asynchronously for that date
- [x] GET `/api/logs` returns paginated results in shape `{ data: DailyLog[], meta: { total, page, pageSize } }`
- [x] GET `/api/logs/[date]` returns the entry with the latest `createdAt` when multiple entries exist for the same date
- [x] All 4 API endpoints return 401 when no valid session exists
- [x] Zod validation rejects invalid input and returns 400 with field-level error details
- [x] Form pre-fills existing values when a correction is being made
- [x] Correction banner is shown only when `existing` prop is non-null
- [x] `workoutType` select is conditionally rendered only when `workedOut` is checked

---

## UI/UX

### Log Page (`/log`)

**Layout**: Single-column, max-width `max-w-lg`. Header shows "Daily Log" with today's date.

**States**:
- **New entry**: Form with empty fields, submit button reads "Save Entry"
- **Correction**: Form pre-filled with existing values, blue info banner at top, submit button reads "Save Correction"
- **Submitting**: Button disabled with "Saving..." text

**Form sections** (separated by border-top dividers):
1. Required: Weight (kg)
2. Activity: Steps, Worked out checkbox, Workout type (conditional)
3. Nutrition: 2x2 grid of Calories, Protein, Carbs, Sodium
4. BIA Scale: 3-column grid of Body Fat %, Muscle Mass, Body Water %
5. Lifestyle: Sleep hours

**After submit**: Toast notification, redirect to `/dashboard`

---

## Algorithm Rules

### EMA Weight Smoothing

**Source**: `src/lib/algorithms/ema.ts`
**Doc reference**: `docs/business-rules.md #1`

**Formula**:
```
EMA_today = (weight_today x 0.3) + (EMA_yesterday x 0.7)
```

**Null handling**: If `prevEMA` is null (no previous computed metric), seed with raw weight: `EMA = weight_today`
**Seed case**: First entry ever -- `calcEMA(todayWeight, null)` returns `todayWeight`
**Threshold constants**: alpha = 0.3

### Rolling 7-Day Average

**Source**: `src/lib/algorithms/rolling-average.ts`
**Doc reference**: `docs/business-rules.md #1`

**Formula**:
```
rollingAvg7d = mean of last 7 daily weights
```

**Null handling**: Returns null if fewer than 7 weights are provided
**Seed case**: First 6 entries -- `rollingAvg7d` is null

### Hydration Correction

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
**Threshold constants**: baseline body water = 60%, correction magnitude = 0.5% fat per 1% water deviation

---

## Zod Schema (`src/lib/validations/daily-log.ts`)

```ts
import { z } from 'zod'

export const WORKOUT_TYPES = ['STRENGTH', 'CARDIO', 'HIIT', 'YOGA', 'SPORTS', 'OTHER'] as const

export const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  weight: z.number().positive('Weight must be positive'),
  steps: z.number().int().nonnegative().optional(),
  workedOut: z.boolean().optional().default(false),
  workoutType: z.enum(WORKOUT_TYPES).optional(),
  caloriesIntake: z.number().int().nonnegative().optional(),
  proteinIntake: z.number().nonnegative().optional(),
  carbIntake: z.number().nonnegative().optional(),
  sodiumIntake: z.number().int().nonnegative().optional(),
  bodyFatPct: z.number().min(1).max(70).optional(),
  skeletalMuscleMass: z.number().nonnegative().optional(),
  bodyWaterPct: z.number().min(1).max(99).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
})

export type DailyLogInput = z.input<typeof dailyLogSchema>
export type DailyLogOutput = z.infer<typeof dailyLogSchema>
```

---

## API Contract

### GET /api/logs

**Purpose**: List daily log entries for the authenticated user within an optional date range
**Auth**: Required (session)

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| from | string (YYYY-MM-DD) | No | Start date filter |
| to | string (YYYY-MM-DD) | No | End date filter |
| page | number | No | Page number, default 1 |
| pageSize | number | No | Results per page, default 30 |

**Response -- 200 OK**
```json
{
  "data": [
    {
      "id": "cuid",
      "userId": "cuid",
      "date": "2026-03-28T00:00:00.000Z",
      "weight": 78.4,
      "steps": 9234,
      "workedOut": true,
      "workoutType": "STRENGTH",
      "caloriesIntake": 2100,
      "proteinIntake": 165,
      "carbIntake": 220,
      "sodiumIntake": 2400,
      "bodyFatPct": 18.2,
      "skeletalMuscleMass": 34.1,
      "bodyWaterPct": 59.5,
      "sleepHours": 7.5,
      "createdAt": "2026-03-28T06:00:00.000Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "pageSize": 30 }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

### POST /api/logs

**Purpose**: Create a new daily log entry
**Auth**: Required (session)

**Request**
```json
{
  "date": "2026-03-28",
  "weight": 78.4,
  "steps": 9234,
  "workedOut": true,
  "workoutType": "STRENGTH",
  "caloriesIntake": 2100,
  "proteinIntake": 165,
  "carbIntake": 220,
  "sodiumIntake": 2400,
  "bodyFatPct": 18.2,
  "skeletalMuscleMass": 34.1,
  "bodyWaterPct": 59.5,
  "sleepHours": 7.5
}
```

**Response -- 201 Created**
```json
{
  "data": { "id": "cuid", "userId": "cuid", "date": "2026-03-28T00:00:00.000Z", "weight": 78.4, "..." : "..." }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |
| 400 | Zod validation failed | `{ "error": "Invalid input", "details": { ... } }` |
| 409 | Duplicate entry for same (userId, date) | `{ "error": "A log for this date already exists. Use PUT to create a correction." }` |
| 500 | Unexpected server error | `{ "error": "Internal server error" }` |

---

### GET /api/logs/[date]

**Purpose**: Get the canonical (latest) log entry for a specific date
**Auth**: Required (session)

**Response -- 200 OK**
```json
{
  "data": { "id": "cuid", "userId": "cuid", "date": "2026-03-28T00:00:00.000Z", "weight": 78.4, "..." : "..." }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |
| 404 | No entry for this date | `{ "error": "Not found" }` |

---

### PUT /api/logs/[date]

**Purpose**: Create a correction entry for a specific date (new row, immutability pattern)
**Auth**: Required (session)

**Request**
```json
{
  "weight": 78.2,
  "steps": 9500
}
```

**Response -- 201 Created**
```json
{
  "data": { "id": "cuid_new", "userId": "cuid", "date": "2026-03-28T00:00:00.000Z", "weight": 78.2, "..." : "..." }
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

### Unit Tests (`src/__tests__/algorithms/ema.test.ts`)

Verified count = 5

| Test | Assertion |
|------|-----------|
| Seeds with raw weight on first entry (no previous EMA) | `calcEMA(80, null)` returns 80 |
| Applies alpha=0.3 correctly | `calcEMA(81, 80)` returns `0.3*81 + 0.7*80 = 80.3` |
| Converges toward stable weight over many days | After 10 iterations at 80.0 from EMA 85.0, result approaches 80 |
| Responds faster to large weight spikes than simple average | EMA after spike is closer to spike than rolling avg would be |
| Supports custom alpha | `calcEMA(81, 80, 0.5)` returns `0.5*81 + 0.5*80 = 80.5` |

### Unit Tests (`src/__tests__/algorithms/rolling-average.test.ts`)

Verified count = 4

| Test | Assertion |
|------|-----------|
| Returns null for fewer than 7 entries | `calcRollingAvg7d([1,2,3])` returns null |
| Returns average of last 7 for exactly 7 entries | Correct mean of 7 values |
| Uses only the last 7 when given more | Ignores earlier entries |
| Handles all identical weights | Returns that identical value |

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

No dedicated service tests exist for `daily-log.ts`.

Verified count = 0

### API Tests

No dedicated API tests exist for log routes.

Verified count = 0

### E2E Tests

No E2E tests exist (Playwright excluded from simplified stack).

---

## Deferred / Out of Scope

| Item | Reason | Future Phase |
|------|--------|--------------|
| Log history table on /log page | Feature doc mentions `LogHistory` component showing last 14 days; not implemented in current UI | TBD |
| TodayStatus banner component | Feature doc mentions a banner for today's log status; implemented inline as correction banner instead | N/A |
| Date picker for past dates | Feature doc says users can log for past dates; current UI only logs for today | TBD |
| Weight range validation (20-300 kg) | Feature doc specifies 20-300 kg range; Zod schema only enforces `positive()` | TBD |
| Body fat % range (3-60%) | Feature doc specifies 3-60%; Zod schema uses `min(1).max(70)` | TBD |
| Body water % range (30-80%) | Feature doc specifies 30-80%; Zod schema uses `min(1).max(99)` | TBD |
| Service-level and API-level tests | No test files exist for daily-log service or log API routes | TBD |

---

## Dependencies

- Phase 1 Layer 2 (Auth) must be complete -- session required for all endpoints
- `src/lib/services/computed.ts` -- `recomputeMetrics` must exist for post-save trigger
- `src/lib/algorithms/ema.ts`, `rolling-average.ts`, `body-composition.ts`, `confidence.ts`, `alerts.ts` -- all called by `recomputeMetrics`
