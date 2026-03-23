# Dashboard

## Overview

The dashboard is the first screen users see after logging in. It shows the current state of their body composition journey at a glance: latest weight (EMA-smoothed), estimated fat%, lean mass, weekly trend, confidence score, and any active alerts. It is read-only — users go to `/log` to enter data.

---

## Data Model

References `ComputedMetric`, `DailyLog`, `UserGoal` in `docs/database-schema.md`.

---

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview panel with KPI cards, weekly trend sparkline, and alerts |

---

## Form Fields

No form fields. Dashboard is read-only.

---

## Business Rules

- The dashboard always shows the **latest computed metrics** for the user.
- If no data has been logged yet, the dashboard shows an empty state directing users to `/log`.
- If fewer than 7 days of data exist, the 7-day rolling average is shown as "N/A".
- Confidence score is displayed as a percentage bar (0–100%).
- `weeklyEmaDelta` is the difference between today's EMA and the EMA 7 days ago. Negative = weight loss. Formatted as `−0.35 kg` or `+0.20 kg`.
- Alerts are shown as dismissible banners above the KPI cards.

---

## Components

| Component | Purpose |
|-----------|---------|
| `OverviewPanel` | KPI cards: current weight, EMA weight, true fat%, estimated lean mass |
| `WeeklyTrendWidget` | Sparkline chart of raw weight + EMA for last 14 days |
| `ConfidenceBar` | Horizontal bar showing confidence score with sub-score breakdown on hover |
| `AlertsBanner` | Dismissible alert cards for active alerts (plateau, muscle loss risk, etc.) |
| `EmptyStateBanner` | Shown when no logs exist — prompts user to log first entry |

---

## API Endpoints

| Method | Route | Purpose | Access |
|--------|-------|---------|--------|
| `GET` | `/api/dashboard/summary` | Fetch all data needed for dashboard | Authenticated |
