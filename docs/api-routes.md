# API Routes

All routes are under `/api/`. Authentication is required for all routes except `/api/auth/*`. Authenticated user ID is extracted from the session — users can only access their own data.

---

## Standard Response Shapes

**Success (list)**:
```json
{ "data": [...], "meta": { "total": 42, "page": 1, "pageSize": 30 } }
```

**Success (single)**:
```json
{ "data": { ... } }
```

**Error**:
```json
{ "error": "Human-readable message", "details": [...] }
```

---

## Auth

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/[...nextauth]` | NextAuth handler (login, logout, session) |
| `POST` | `/api/auth/register` | Create new user account |

---

## Daily Logs

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/logs` | Authenticated | List logs for authenticated user. Query: `from`, `to` (ISO dates), `page`, `pageSize` |
| `POST` | `/api/logs` | Authenticated | Create a new daily log entry |
| `GET` | `/api/logs/[date]` | Authenticated | Get the canonical log for a specific date (YYYY-MM-DD). Returns latest entry if multiple exist |
| `PUT` | `/api/logs/[date]` | Authenticated | Create a correction entry for a date (new row, same date — does not modify original) |

**POST `/api/logs` body**:
```json
{
  "date": "2026-03-23",
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

**Response**: `{ "data": DailyLog }` — also triggers `ComputedMetric` recalculation for the date.

---

## Weekly Metrics

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/weekly` | Authenticated | List weekly metrics. Query: `from`, `to` (ISO dates) |
| `POST` | `/api/weekly` | Authenticated | Create or update weekly metric for a given week |
| `GET` | `/api/weekly/[weekStart]` | Authenticated | Get weekly metric for a specific week start date (YYYY-MM-DD, must be Monday) |
| `PUT` | `/api/weekly/[weekStart]` | Authenticated | Update weekly metric |

**POST `/api/weekly` body**:
```json
{
  "weekStartDate": "2026-03-23",
  "waistCm": 84.5,
  "progressPhotoUrl": "https://...",
  "benchPressPeak": 80,
  "squatPeak": 100,
  "deadliftPeak": 120,
  "otherStrengthNotes": "New PR on deadlift"
}
```

---

## Computed Metrics

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/computed` | Authenticated | Get computed metrics for a date range. Query: `from`, `to`, `recalculate=true` (optional, triggers recompute) |
| `GET` | `/api/computed/[date]` | Authenticated | Get computed metric for a specific date |

**GET `/api/computed` response**:
```json
{
  "data": [
    {
      "date": "2026-03-23",
      "emaWeight": 78.1,
      "rollingAvg7d": 78.3,
      "trueFatPct": 17.8,
      "estimatedFatMass": 13.9,
      "estimatedLeanMass": 64.2,
      "confidenceScore": 74,
      "proteinScore": 92,
      "trainingScore": 67,
      "activityScore": 62,
      "alerts": []
    }
  ],
  "meta": { "total": 30 }
}
```

---

## Goals

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/goals` | Authenticated | Get the authenticated user's goals (single row or null) |
| `PUT` | `/api/goals` | Authenticated | Create or update goals (upsert) |

**PUT `/api/goals` body**:
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

---

## Dashboard

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/dashboard/summary` | Authenticated | Latest metrics for dashboard overview panel |

**Response**:
```json
{
  "data": {
    "currentWeight": 78.4,
    "emaWeight": 78.1,
    "trueFatPct": 17.8,
    "estimatedLeanMass": 64.2,
    "weeklyEmaDelta": -0.35,
    "confidenceScore": 74,
    "alerts": [],
    "lastLogDate": "2026-03-23"
  }
}
```

---

## Progress

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/progress/weight-trend` | Authenticated | Raw weight + EMA + rolling avg for a date range. Query: `from`, `to` |
| `GET` | `/api/progress/body-composition` | Authenticated | Fat mass + lean mass trend. Query: `from`, `to` |

**GET `/api/progress/weight-trend` response**:
```json
{
  "data": [
    { "date": "2026-03-01", "rawWeight": 79.2, "emaWeight": 79.0, "rollingAvg7d": 79.1 },
    { "date": "2026-03-02", "rawWeight": 78.8, "emaWeight": 78.9, "rollingAvg7d": 79.0 }
  ]
}
```

---

## Insights

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/insights` | Authenticated | Behaviour summary: protein adherence %, workout consistency %, avg steps, active alerts |

**Response**:
```json
{
  "data": {
    "proteinAdherencePct": 82,
    "workoutConsistencyPct": 67,
    "avgSteps7d": 7840,
    "avgSteps30d": 8120,
    "currentStreak": {
      "workoutDays": 3,
      "loggedDays": 7
    },
    "activeAlerts": [
      { "type": "low_protein", "message": "...", "severity": "info" }
    ]
  }
}
```

---

## Settings

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/settings/profile` | Authenticated | Get user profile (name, email, timezone) |
| `PUT` | `/api/settings/profile` | Authenticated | Update profile |
| `PUT` | `/api/settings/password` | Authenticated | Change password (requires current password) |
| `DELETE` | `/api/settings/account` | Authenticated | Delete account and all data (irreversible) |

---

## File Upload

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/api/upload/progress-photo` | Authenticated | Generate S3 presigned upload URL for a progress photo |

**POST body**:
```json
{ "weekStartDate": "2026-03-23", "filename": "photo.jpg", "contentType": "image/jpeg" }
```

**Response**:
```json
{
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "fileUrl": "https://s3.amazonaws.com/..."
  }
}
```

The client uploads directly to `uploadUrl` via PUT. After upload, the client saves `fileUrl` to `WeeklyMetric.progressPhotoUrl` via `PUT /api/weekly/[weekStart]`.
