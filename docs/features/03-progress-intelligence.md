# Progress Intelligence

## Overview

The Progress module visualises body composition trends over time. It shows raw vs smoothed weight, estimated fat mass vs lean mass, and the relationship between calorie deficit and actual fat loss. Users can also enter weekly measurements (waist circumference, progress photos, strength metrics) here.

---

## Data Model

References `ComputedMetric`, `DailyLog`, `WeeklyMetric` in `docs/database-schema.md`.

Full algorithm specifications: `docs/business-rules.md` sections 1–5.

---

## Pages

| Route | Description |
|-------|-------------|
| `/progress` | Charts + weekly metric entry form |

---

## Form Fields

### Weekly Metric Entry

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Week | Date | Yes | Auto-populated to current week's Monday |
| Waist circumference (cm) | Number | No | Step 0.1 |
| Progress photo | File | No | JPEG/PNG/HEIC, max 10MB. Uploaded to S3 |
| Bench press peak (kg) | Number | No | Heaviest successful set this week |
| Squat peak (kg) | Number | No | |
| Deadlift peak (kg) | Number | No | |
| Strength notes | Text | No | Free text, max 500 chars |

---

## Business Rules

- **Weight trend chart**: Always shows both raw daily weight (grey dots) and EMA line (coloured). Rolling 7d average shown as a dashed line if ≥7 entries exist.
- **Body composition chart**: Stacked area chart of `estimatedFatMass` (red) and `estimatedLeanMass` (blue). Only shown when at least one BIA entry exists.
- **Date range selector**: Default last 30 days. Options: 14d, 30d, 60d, 90d, all time.
- Progress photos are uploaded directly to S3 via presigned URL. The URL is stored in `WeeklyMetric.progressPhotoUrl` after successful upload.
- S3 path: `progress-photos/{userId}/{weekStartDate}/{filename}`
- Strength trend: If at least 3 weeks of any lift are available, a mini line chart is shown per lift.

---

## Components

| Component | Purpose |
|-----------|---------|
| `WeightTrendChart` | Recharts area/line chart: raw weight dots + EMA line + rolling avg dashed line |
| `BodyCompositionChart` | Recharts stacked area: fat mass + lean mass over time |
| `DeficitVsFatLossChart` | Bar chart comparing estimated calorie deficit to estimated fat loss per week |
| `WeeklyMetricForm` | Form for waist, photo upload, strength entries |
| `ProgressPhotoGallery` | Thumbnail grid of uploaded progress photos by week |
| `DateRangePicker` | Controls for chart date range selection |

---

## API Endpoints

| Method | Route | Purpose | Access |
|--------|-------|---------|--------|
| `GET` | `/api/progress/weight-trend` | Raw + EMA + rolling avg for date range | Authenticated |
| `GET` | `/api/progress/body-composition` | Fat mass + lean mass trend | Authenticated |
| `GET` | `/api/weekly` | List weekly metrics | Authenticated |
| `POST` | `/api/weekly` | Create/update weekly metric | Authenticated |
| `GET` | `/api/weekly/[weekStart]` | Get weekly metric for a week | Authenticated |
| `PUT` | `/api/weekly/[weekStart]` | Update weekly metric | Authenticated |
| `POST` | `/api/upload/progress-photo` | Get presigned S3 upload URL | Authenticated |
