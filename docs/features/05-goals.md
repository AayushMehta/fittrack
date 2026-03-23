# Goals

## Overview

The Goals module lets users set fitness targets that feed directly into the confidence score and fat loss estimation algorithms. Without goals, the system cannot calculate protein score, training score, or activity score — confidence is 0 and estimates are unavailable. Goals are optional but strongly recommended.

---

## Data Model

References `UserGoal` in `docs/database-schema.md`.

Confidence score formula: `docs/business-rules.md` section 2.

---

## Pages

| Route | Description |
|-------|-------------|
| `/goals` | Goal setting form with current values pre-filled |

---

## Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Target weight (kg) | Number | No | Used for plateau detection context |
| Target body fat % | Number | No | Used for progress tracking |
| Daily calorie target (kcal) | Number | No | Used for fat loss estimation |
| Daily protein target (g) | Number | No | Feeds protein score |
| Daily steps target | Number | No | Feeds activity score. Default shown: 8,000 |
| Weekly workout target | Number | No | Feeds training score. Default shown: 3 |

---

## Business Rules

- All goal fields are optional. Unset goals result in a confidence sub-score of 0 for that dimension (not excluded from the average).
- When goals are updated, `ComputedMetric` for the last 30 days is recalculated asynchronously (because the denominators for confidence sub-scores have changed).
- Goals are stored as a single row per user in `UserGoal`. Updating goals is always an upsert.
- There is no goal history — only the current active goals are stored.
- Validation: `targetBodyFatPct` must be between 3% and 40%. `weeklyWorkoutTarget` must be between 1 and 7. `dailyStepsTarget` must be between 1,000 and 30,000.

---

## Components

| Component | Purpose |
|-----------|---------|
| `GoalForm` | Form with all goal fields. Submits via PUT `/api/goals` |
| `GoalImpactPreview` | Shows how the goal settings affect confidence score calculation (live preview) |

---

## API Endpoints

| Method | Route | Purpose | Access |
|--------|-------|---------|--------|
| `GET` | `/api/goals` | Get current goals | Authenticated |
| `PUT` | `/api/goals` | Create or update goals (upsert) | Authenticated |
