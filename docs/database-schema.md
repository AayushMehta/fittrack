# Database Schema

Full Prisma schema lives at `prisma/schema.prisma`. This document describes each model, its fields, relationships, and design decisions.

> **SQLite note**: The project uses SQLite (`file:./dev.db`) instead of PostgreSQL. Two PostgreSQL-specific features are absent:
> - `@db.Date` annotations are omitted — `DateTime` fields store full timestamps (UTC midnight used for date-only semantics)
> - Prisma enums are not supported in SQLite — `workoutType` is stored as `String?` and validated at the application layer

---

## Enums (application-layer validation only)

`WorkoutType` values accepted by the daily log schema: `STRENGTH | CARDIO | HIIT | YOGA | SPORTS | OTHER`

---

## Models

### User

The authenticated account. Each user's data is completely private.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // bcrypt hash
  timezone  String   @default("Asia/Kolkata")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  dailyLogs       DailyLog[]
  weeklyMetrics   WeeklyMetric[]
  computedMetrics ComputedMetric[]
  goals           UserGoal?
}
```

---

### DailyLog

One entry per user per day. Immutable after creation — if a user wants to correct an entry, a new `DailyLog` for the same date is created (latest `createdAt` wins in queries).

```prisma
model DailyLog {
  id     String   @id @default(cuid())
  userId String
  date   DateTime @db.Date // morning, fasted

  // Required
  weight Float // kg

  // Activity
  steps       Int?
  workedOut   Boolean     @default(false)
  workoutType WorkoutType?

  // Nutrition (optional but recommended for fat loss estimation)
  caloriesIntake Int?
  proteinIntake  Float? // grams
  carbIntake     Float? // grams
  sodiumIntake   Int?   // mg

  // BIA device readings (raw, uncorrected)
  bodyFatPct         Float?
  skeletalMuscleMass Float? // kg
  bodyWaterPct       Float?

  // Lifestyle
  sleepHours Float?

  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}
```

**Key rule**: `DailyLog` has no `updatedAt`. It is append-only. If two entries exist for the same `(userId, date)`, the one with the latest `createdAt` is the canonical entry.

---

### WeeklyMetric

One entry per user per week (week starts on Monday). Holds body measurements and progress photos that are too noisy to track daily.

```prisma
model WeeklyMetric {
  id            String   @id @default(cuid())
  userId        String
  weekStartDate DateTime @db.Date // Monday of the week

  // Body measurements
  waistCm          Float?
  progressPhotoUrl String? // S3 URL

  // Strength tracking (optional, peak lift for the week)
  benchPressPeak     Float? // kg
  squatPeak          Float? // kg
  deadliftPeak       Float? // kg
  otherStrengthNotes String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, weekStartDate])
  @@index([userId, weekStartDate])
}
```

---

### ComputedMetric

Derived metrics calculated from `DailyLog` and `WeeklyMetric`. Never user-editable. Recalculated any time new input data arrives.

```prisma
model ComputedMetric {
  id     String   @id @default(cuid())
  userId String
  date   DateTime @db.Date

  // Weight smoothing
  emaWeight    Float  // exponential moving average (α=0.3)
  rollingAvg7d Float? // 7-day simple moving average (requires ≥7 entries)

  // Body composition (physiologically corrected)
  trueFatPct        Float? // BIA fat% after hydration correction
  estimatedFatMass  Float? // kg
  estimatedLeanMass Float? // kg

  // Confidence scoring (0–100 each)
  confidenceScore Float?
  proteinScore    Float?
  trainingScore   Float?
  activityScore   Float?

  // Alerts
  // Shape: Array<{ type: string, message: string, severity: "info" | "warning" | "critical" }>
  alerts Json @default("[]")

  computedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}
```

---

### UserGoal

User-defined fitness targets. One row per user (upsert). All fields optional — unset goals mean the corresponding confidence sub-scores default to 0.

```prisma
model UserGoal {
  id     String @id @default(cuid())
  userId String @unique

  targetWeight        Float? // kg
  targetBodyFatPct    Float? // %
  dailyCalorieTarget  Int?   // kcal
  dailyProteinTarget  Float? // grams
  dailyStepsTarget    Int?   // default behaviour: 8000
  weeklyWorkoutTarget Int?   // default behaviour: 3

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Relationships Summary

```
User
 ├── DailyLog[]        (1:many, cascade delete)
 ├── WeeklyMetric[]    (1:many, cascade delete)
 ├── ComputedMetric[]  (1:many, cascade delete)
 └── UserGoal?         (1:1 optional, cascade delete)
```

---

## Indexes

| Model | Index | Reason |
|-------|-------|--------|
| `DailyLog` | `(userId, date)` unique + index | Primary lookup pattern: user's log for a date range |
| `WeeklyMetric` | `(userId, weekStartDate)` unique + index | Primary lookup: weekly entries for a user |
| `ComputedMetric` | `(userId, date)` unique + index | Primary lookup: computed values for a date range |
| `UserGoal` | `userId` unique | One goal row per user |

---

## Design Rules

1. **No money fields** — FitTrack has no financial data. All numeric fields use `Float` (weight, body fat %) or `Int` (steps, calories).
2. **No soft delete** — Users can delete their account (cascade deletes all data). Individual log entries cannot be deleted — only superseded by a newer entry for the same date.
3. **Raw vs derived separation** — `DailyLog` / `WeeklyMetric` hold raw input. `ComputedMetric` holds all derived values. Never mix them.
4. **No enum for severity** — Alert severity is stored as a JSON string field inside the `alerts` array to avoid schema migrations when alert types change.
