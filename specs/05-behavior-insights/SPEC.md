# Spec: Behavior Insights

**Phase**: 2
**Routes**: `/insights`, `/api/insights`
**Access**: Authenticated users only

**Files**:
- `src/app/(app)/insights/page.tsx` -- Server component; fetches insights data via `getInsights`, passes to `InsightsClient`
- `src/app/(app)/insights/insights-client.tsx` -- Client component; adherence bars, streak counter, alert history
- `src/app/api/insights/route.ts` -- API handler for GET insights summary
- `src/lib/services/insights.ts` -- Service function: `getInsights`

---

## Overview

The Insights module surfaces behavioral patterns that explain the user's body composition trajectory. It answers "Am I actually doing the things that drive results?" by computing 30-day adherence rates for protein, training, and steps, tracking the current logging streak, and displaying recent alerts from the decision engine. This is a read-only module -- no data entry.

---

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| INS-1 | logged-in user | see my 30-day protein adherence rate | I know how consistently I am hitting my protein target |
| INS-2 | logged-in user | see my 30-day training adherence rate | I know if I am working out enough |
| INS-3 | logged-in user | see my 30-day steps adherence rate | I know if my daily activity level is sufficient |
| INS-4 | logged-in user | see my current consecutive-day logging streak | I stay motivated to log every day |
| INS-5 | logged-in user | see recent alerts from the decision engine with dates | I can understand what triggered each alert and when |
| INS-6 | new user with no data | see an empty state | I know I need to start logging to see insights |

---

## Happy Flow -- Viewing Insights

1. User navigates to `/insights`
2. Server component calls `getInsights(userId)`
3. Service queries last 30 days of `DailyLog`, `UserGoal`, and last 7 `ComputedMetric` entries
4. Service computes: protein adherence %, training adherence %, steps adherence %, logged days count, consecutive-day streak, and alert history
5. Data passed to `InsightsClient`
6. Client renders: adherence bars card, streak card, alert history card

## Happy Flow -- No Data Yet

1. User navigates to `/insights`
2. `getInsights` finds 0 `DailyLog` entries in last 30 days
3. Returns `{ adherence: null, streaks: null, alertHistory: [] }`
4. Client renders empty state: "No data yet. Start logging to see insights."

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| User has no DailyLog entries in last 30 days | `adherence` is null; empty state shown: "No data yet. Start logging to see insights." |
| User has entries but no UserGoal | `proteinPct` = 0% (goal is null so `filter` condition `goal?.dailyProteinTarget` is falsy); `stepsPct` = 0% |
| User logged protein but no goal is set | `withProtein` filter requires `goal?.dailyProteinTarget` to be truthy; result is 0 adherence |
| User has steps data but no steps goal | `withSteps` filter requires `goal?.dailyStepsTarget` to be truthy; result is 0 adherence |
| User logged today and every day for 5 consecutive days | Streak = 5 (counts backwards from today) |
| User did NOT log today but logged yesterday | Streak = 0 (streak starts from today; first date must equal today) |
| User has no alerts in recent computed metrics | `alertHistory` is empty array; alert history card not rendered |
| ComputedMetric.alerts is empty JSON array "[]" | Parsed as empty array; no alerts extracted for that date |
| Unauthenticated request to GET /api/insights | Returns 401 `{ "error": "Unauthorized" }` |
| User has exactly 1 logged day | `adherence.loggedDays` = 1; percentages calculated from 1 day; streak = 1 (if that day is today) |

---

## Acceptance Criteria

- [x] GET `/api/insights` returns 401 when no valid session
- [x] GET `/api/insights` returns adherence percentages, streak count, and alert history
- [x] When no DailyLog entries exist in last 30 days, response has `adherence: null` and `streaks: null`
- [x] Protein adherence counts days where `proteinIntake >= dailyProteinTarget * 0.8` (80% threshold)
- [x] Training adherence counts days where `workedOut = true`
- [x] Steps adherence counts days where `steps >= dailyStepsTarget`
- [x] Current streak counts consecutive days from today backwards where a DailyLog entry exists; breaks at first gap
- [x] Alert history is extracted from the last 7 `ComputedMetric` entries' `alerts` JSON field
- [x] Empty state is shown when `adherence` is null
- [x] Adherence bars render with percentage labels and visual progress bars
- [x] Streak displays as a large number with "days" unit
- [x] Alert history cards are styled by severity (critical=red, warning=amber, info=blue) with date prefix

---

## UI/UX

### Insights Page (`/insights`)

**Layout**: Full-width, vertical stack with `space-y-6`. Heading "Insights" at top.

**Empty state**: Dashed-border card with centered text "No data yet. Start logging to see insights."

**30-Day Adherence Card**: Card with "30-Day Adherence" heading. Three horizontal progress bars:
1. "Protein goal" with percentage
2. "Training" with percentage
3. "Steps goal" with percentage
Footer text: "Based on {N} logged days"

**Current Streak Card**: Card with "Current Streak" heading. Large number display (e.g., "7") with "days" unit.

**Recent Alerts Card** (conditional, only when alertHistory is non-empty): Card with "Recent Alerts" heading. List of alert cards, each showing date in bold followed by alert message. Cards styled by severity.

---

## Zod Schema

No dedicated Zod schema for insights. The API is GET-only with no request body.

---

## API Contract

### GET /api/insights

**Purpose**: Fetch behavior summary: adherence rates, streak, and recent alerts
**Auth**: Required (session)

**Response -- 200 OK (with data)**
```json
{
  "data": {
    "adherence": {
      "proteinPct": 82,
      "trainingPct": 40,
      "stepsPct": 60,
      "loggedDays": 25
    },
    "streaks": {
      "currentStreak": 7
    },
    "alertHistory": [
      {
        "type": "PLATEAU",
        "message": "Weight has barely moved in 14 days...",
        "severity": "warning",
        "date": "2026-03-28"
      }
    ]
  }
}
```

**Response -- 200 OK (no data)**
```json
{
  "data": {
    "adherence": null,
    "streaks": null,
    "alertHistory": []
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |

---

## Test Scenarios

### Unit Tests (`src/__tests__/algorithms/alerts.test.ts`)

Verified count = 8 (relevant to insights via alert history)

| Test | Assertion |
|------|-----------|
| Returns no alerts for healthy metrics | Empty array returned |
| Flags plateau when EMA moves < 0.1 kg in 14 days | PLATEAU alert generated |
| Flags fat loss too slow when losing < 0.1 kg/week | FAT_LOSS_TOO_SLOW alert generated |
| Flags fat loss too fast when losing > 0.75 kg/week | FAT_LOSS_TOO_FAST alert generated |
| Flags muscle loss when lean mass drops > 0.5 kg | MUSCLE_LOSS_RISK alert generated |
| Flags low protein when below 80% of goal | LOW_PROTEIN alert generated |
| Does not flag low protein when within 80% | No LOW_PROTEIN alert |
| Handles null ema14dAgo (no plateau/trend alerts) | Only non-EMA alerts generated |

### Service Tests

No dedicated service tests for `insights.ts`.

Verified count = 0

### API Tests

No dedicated API tests for `/api/insights`.

Verified count = 0

### E2E Tests

No E2E tests (Playwright excluded).

---

## Deferred / Out of Scope

| Item | Reason | Future Phase |
|------|--------|--------------|
| ProteinTrendChart (30-day bar chart) | Feature doc describes daily protein vs target bar chart; not implemented | TBD |
| StepsTrendChart (30-day bar chart) | Feature doc describes daily steps vs target bar chart; not implemented | TBD |
| WorkoutCalendar (60-day heatmap) | Feature doc describes calendar heatmap of workout days; not implemented | TBD |
| Workout streak (consecutive workout days) | Feature doc mentions workout streak; only logging streak is implemented | TBD |
| Alert history timeline (click to expand) | Feature doc mentions clicking alert type to see timeline; not implemented | TBD |
| Workout consistency % calculation per feature doc formula | Feature doc specifies `(days worked out / (weeklyWorkoutTarget x 30/7)) x 100`; actual implementation uses simple `(withTraining / totalDays) x 100` | TBD |
| Avg steps (7d and 30d) separate values | Feature doc specifies both; implementation only shows adherence % not raw averages | TBD |
| Service-level and API-level tests | No test files for insights | TBD |

---

## Dependencies

- Phase 1 must be complete (Daily Log, Goals)
- Phase 2 alert generation must be integrated into `recomputeMetrics` pipeline
- `ComputedMetric.alerts` JSON field must be populated by `generateAlerts`
- `DailyLog` and `UserGoal` models must exist for adherence calculations
