# Spec: Goals

**Phase**: 1
**Routes**: `/goals`, `/api/goals`
**Access**: Authenticated users only

**Files**:
- `src/app/(app)/goals/page.tsx` -- Server component; fetches goal, latest metric, and recent logs; computes current stats; passes to `GoalsClient`
- `src/app/(app)/goals/goals-client.tsx` -- Client component; goal form with live preview panel showing current vs target
- `src/app/api/goals/route.ts` -- API handler for GET (get goals) and PUT (upsert goals)
- `src/lib/services/goal.ts` -- Service functions: `getGoal`, `upsertGoal`
- `src/lib/validations/goal.ts` -- Zod validation schema: `goalSchema`

---

## Overview

The Goals module lets users set fitness targets that feed directly into the confidence score algorithm. Without goals, confidence sub-scores default to 0 and fat loss estimates lack context. Goals are stored as a single row per user (upsert pattern). When goals are updated, `ComputedMetric` for today is recomputed asynchronously to reflect the new denominators.

---

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| GOAL-1 | logged-in user | set my target weight | I can see progress toward my goal on the dashboard chart |
| GOAL-2 | logged-in user | set my daily protein target | my protein score is computed and contributes to confidence |
| GOAL-3 | logged-in user | set my daily steps and weekly workout targets | my activity and training scores are computed |
| GOAL-4 | logged-in user | see a live preview of current vs target values as I type | I can understand the gap before saving |
| GOAL-5 | logged-in user | update my goals at any time | my confidence score adjusts to reflect new targets |

---

## Happy Flow -- Setting Goals for the First Time

1. User navigates to `/goals`
2. Server component calls `getGoal(userId)` -- returns null (no goals set)
3. Form renders with all fields empty; preview panel shows current values with "not set" for targets
4. User fills in targetWeight, dailyProteinTarget, dailyStepsTarget, weeklyWorkoutTarget
5. Preview panel updates live as user types (via `useWatch`)
6. User clicks "Save Goals"
7. Client sends PUT `/api/goals` with form data
8. API validates via `goalSchema`, upserts `UserGoal` row (creates new), fires `recomputeMetrics` for today
9. Returns updated goal object
10. Client shows success toast "Goals saved!" and refreshes page

## Happy Flow -- Updating Existing Goals

1. User navigates to `/goals`
2. Server component finds existing `UserGoal` -- form pre-fills with saved values
3. Preview panel shows current metrics vs saved targets with gap indicators (arrows and delta values)
4. User modifies dailyCalorieTarget
5. Preview updates live
6. User saves; PUT upserts the existing row with new values
7. `recomputeMetrics` recalculates confidence score with new denominators

---

## Form Fields

### Goal Form

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| targetWeight | number | No | `z.number().positive().optional()` | kg, step 0.1; shown as reference line on dashboard chart |
| targetBodyFatPct | number | No | `z.number().min(1).max(70).optional()` | %; used for progress tracking |
| dailyCalorieTarget | number | No | `z.number().int().positive().optional()` | kcal; used for fat loss estimation |
| dailyProteinTarget | number | No | `z.number().positive().optional()` | grams; feeds protein score |
| dailyStepsTarget | number | No | `z.number().int().positive().optional()` | steps; feeds activity score; algorithm default 8000 when null |
| weeklyWorkoutTarget | number | No | `z.number().int().min(0).max(14).optional()` | days/week; feeds training score; algorithm default 3 when null |

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| User has no UserGoal row yet | GET `/api/goals` returns `{ "data": null }`; form renders empty; preview shows "not set" for all targets |
| All goal fields submitted as empty/undefined | Upsert creates or updates row with all null optional fields; confidence sub-scores will be 0 |
| weeklyWorkoutTarget set to 0 | Accepted by Zod (`min(0)`); `calcSubScore(actual, 0)` returns 0 in algorithm (goal <= 0 guard) |
| User deletes a previously set target (clears field) | Field sent as undefined; Prisma update sets it to null; confidence sub-score for that dimension becomes 0 |
| Unauthenticated request to GET /api/goals | Returns 401 `{ "error": "Unauthorized" }` |
| Unauthenticated request to PUT /api/goals | Returns 401 `{ "error": "Unauthorized" }` |
| targetBodyFatPct set to 0 | Rejected by Zod (`min(1)`) |
| targetBodyFatPct set to 71 | Rejected by Zod (`max(70)`) |
| No ComputedMetric exists (new user) | Preview panel shows null for emaWeight and trueFatPct; gap indicators show "--" |
| No recent DailyLog entries | Preview shows null for avgProtein7d, avgSteps7d; workoutsThisWeek = 0 |

---

## Acceptance Criteria

- [x] GET `/api/goals` returns the user's `UserGoal` row or null if none exists
- [x] PUT `/api/goals` upserts the `UserGoal` row (creates if missing, updates if present)
- [x] PUT `/api/goals` triggers `recomputeMetrics` for today after successful save
- [x] Both API endpoints return 401 when no valid session
- [x] Zod validation rejects invalid input and returns 400 with field-level error details
- [x] Form pre-fills with existing goal values when a `UserGoal` row exists
- [x] Preview panel shows live current vs target comparison using `useWatch`
- [x] Gap indicators show directional arrows (green for on-track, red for off-track) with numeric delta
- [x] Server component fetches current stats (emaWeight, trueFatPct, avgProtein7d, avgSteps7d, workoutsThisWeek) from latest ComputedMetric and recent DailyLogs
- [x] When no goal is set for a metric, preview shows "not set" text

---

## UI/UX

### Goals Page (`/goals`)

**Layout**: `max-w-4xl`, two-column grid on desktop (form left, preview right), stacked on mobile.

**Header**: "Goals" title with subtitle "Set your fitness targets to unlock confidence scoring and alerts."

**Left column -- Goal Form**: Card with "Set Targets" heading. Six fields with labels and units. "Save Goals" button at bottom. All fields are optional.

**Right column -- Current vs Target Preview**: Card with "Current vs Target" heading and "as of {date}" subtitle. Five rows:
1. Weight (EMA) -- current vs target, lower is better
2. Body Fat % -- current vs target, lower is better
3. Protein (7d avg) -- current vs target, higher is better
4. Steps (7d avg) -- current vs target, higher is better
5. Workouts (this week) -- current vs target, higher is better

Each row shows: label, current value (or "--"), arrow, target value (or "not set"), and a colored gap indicator with icon.

**Footer note**: "Preview updates as you type. Save to apply changes to your confidence score."

---

## Zod Schema (`src/lib/validations/goal.ts`)

```ts
import { z } from 'zod'

export const goalSchema = z.object({
  targetWeight: z.number().positive().optional(),
  targetBodyFatPct: z.number().min(1).max(70).optional(),
  dailyCalorieTarget: z.number().int().positive().optional(),
  dailyProteinTarget: z.number().positive().optional(),
  dailyStepsTarget: z.number().int().positive().optional(),
  weeklyWorkoutTarget: z.number().int().min(0).max(14).optional(),
})

export type GoalInput = z.infer<typeof goalSchema>
```

---

## API Contract

### GET /api/goals

**Purpose**: Get the authenticated user's fitness goals
**Auth**: Required (session)

**Response -- 200 OK (goals exist)**
```json
{
  "data": {
    "id": "cuid",
    "userId": "cuid",
    "targetWeight": 74.0,
    "targetBodyFatPct": 14.0,
    "dailyCalorieTarget": 2200,
    "dailyProteinTarget": 175,
    "dailyStepsTarget": 9000,
    "weeklyWorkoutTarget": 4,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-28T00:00:00.000Z"
  }
}
```

**Response -- 200 OK (no goals set)**
```json
{
  "data": null
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

### PUT /api/goals

**Purpose**: Create or update the user's fitness goals (upsert)
**Auth**: Required (session)

**Request**
```json
{
  "targetWeight": 74.0,
  "targetBodyFatPct": 14.0,
  "dailyCalorieTarget": 2200,
  "dailyProteinTarget": 175,
  "dailyStepsTarget": 9000,
  "weeklyWorkoutTarget": 4
}
```

**Response -- 200 OK**
```json
{
  "data": {
    "id": "cuid",
    "userId": "cuid",
    "targetWeight": 74.0,
    "targetBodyFatPct": 14.0,
    "dailyCalorieTarget": 2200,
    "dailyProteinTarget": 175,
    "dailyStepsTarget": 9000,
    "weeklyWorkoutTarget": 4,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-28T10:00:00.000Z"
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

### Unit Tests (`src/__tests__/algorithms/confidence.test.ts`)

Verified count = 7 (relevant to goals module)

| Test | Assertion |
|------|-----------|
| calcSubScore returns 100 when actual equals goal | `calcSubScore(100, 100)` returns 100 |
| calcSubScore caps at 100 when actual exceeds goal | `calcSubScore(150, 100)` returns 100 |
| calcSubScore scales linearly below goal | `calcSubScore(50, 100)` returns 50 |
| calcSubScore returns 0 when goal is 0 or negative | `calcSubScore(50, 0)` returns 0; `calcSubScore(50, -1)` returns 0 |
| calcConfidence averages three scores | `calcConfidence(60, 80, 100)` returns 80 |
| calcConfidence returns 0 when all scores are 0 | `calcConfidence(0, 0, 0)` returns 0 |
| calcConfidence returns 100 when all scores are 100 | `calcConfidence(100, 100, 100)` returns 100 |

### Service Tests

No dedicated service tests for `goal.ts`.

Verified count = 0

### API Tests

No dedicated API tests for `/api/goals`.

Verified count = 0

---

## Deferred / Out of Scope

| Item | Reason | Future Phase |
|------|--------|--------------|
| Goal history | Feature doc states "no goal history -- only current active goals are stored"; no change tracking | TBD |
| GoalImpactPreview component | Feature doc mentions a confidence score impact preview; current implementation shows current vs target gaps instead | N/A |
| Validation range for steps (1000-30000) | Feature doc specifies this range; Zod schema only enforces `int().positive()` | TBD |
| Validation range for workout target (1-7) | Feature doc specifies 1-7; Zod schema uses `min(0).max(14)` | TBD |
| Validation range for body fat (3-40%) | Feature doc specifies 3-40%; Zod schema uses `min(1).max(70)` | TBD |
| 30-day retroactive recompute on goal change | Feature doc says changing goals recomputes last 30 days of ComputedMetric; current code only recomputes today | TBD |
| Service-level and API-level tests | No test files exist for goal service or API routes | TBD |

---

## Dependencies

- Phase 1 Layer 2 (Auth) must be complete
- `src/lib/services/computed.ts` -- `recomputeMetrics` called after goal save
- `src/lib/algorithms/confidence.ts` -- `calcSubScore`, `calcConfidence` use goal values as denominators
- `ComputedMetric` and `DailyLog` models must exist for the server component to compute current stats
