# Daily Logging

## Overview

The daily log is the primary data entry point. Each morning, users record their fasted weight plus optional nutrition, activity, and body composition readings. Entries are immutable — if a user needs to correct a mistake, a new entry is created for the same date (the latest entry is treated as canonical).

---

## Data Model

References `DailyLog` in `docs/database-schema.md`.

Relevant models: `DailyLog`, `User`

---

## Pages

| Route | Description |
|-------|-------------|
| `/log` | Today's log entry form + recent log history (last 14 days) |

---

## Form Fields

### Required

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date | Yes | Defaults to today. User can log for past dates |
| Weight (kg) | Number | Yes | Morning fasted. Step 0.1 |

### Activity

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Steps | Number | No | Integer |
| Did you work out? | Boolean | No | Toggle. Default: No |
| Workout type | Select | No | STRENGTH, CARDIO, HIIT, YOGA, SPORTS, OTHER. Only shown if workout = Yes |

### Nutrition

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Calories intake (kcal) | Number | No | Used for fat loss estimation |
| Protein (g) | Number | No | Critical for confidence score |
| Carbohydrates (g) | Number | No | Used in hydration correction context |
| Sodium (mg) | Number | No | Optional, used for sodium context |

### Body Composition (BIA — Optional)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Body fat % | Number | No | Raw reading from smart scale |
| Skeletal muscle mass (kg) | Number | No | From smart scale |
| Body water % | Number | No | Key input for hydration correction |

### Lifestyle

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Sleep (hours) | Number | No | Step 0.5 |

---

## Business Rules

- One canonical entry per user per date. If a second entry is submitted for the same date, it does not replace the first — both are stored, and the one with the latest `createdAt` is used in all queries and calculations.
- The `date` field stores date only (no time component). All entries are normalized to UTC date at the database level.
- Weight must be between 20 kg and 300 kg.
- Body fat % must be between 3% and 60%.
- Body water % must be between 30% and 80%.
- After a new log is saved, `ComputedMetric` is recalculated for that date and the following 7 days (to update rolling averages downstream).

---

## Components

| Component | Purpose |
|-----------|---------|
| `DailyLogForm` | Full form with all fields, grouped into collapsible sections |
| `LogHistory` | Table of last 14 days of raw log entries with EMA overlay |
| `TodayStatus` | Banner showing whether today's log has been submitted |

---

## API Endpoints

| Method | Route | Purpose | Access |
|--------|-------|---------|--------|
| `GET` | `/api/logs` | List logs for date range | Authenticated |
| `POST` | `/api/logs` | Create a new log entry | Authenticated |
| `GET` | `/api/logs/[date]` | Get canonical log for a date | Authenticated |
| `PUT` | `/api/logs/[date]` | Submit a correction for a date | Authenticated |
