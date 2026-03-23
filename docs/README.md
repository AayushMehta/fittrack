# FitTrack — Documentation

FitTrack is a fitness and body composition intelligence dashboard. It solves a core problem with consumer fitness apps: raw numbers are noisy and misleading. Weight fluctuates from water retention, glycogen, and meal timing. BIA scales are distorted by hydration. FitTrack applies a normalization and intelligence layer to cut through the noise and surface physiological truth.

---

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| Daily Log | `/log` | Record daily weight, steps, workout, nutrition, and optional BIA readings |
| Dashboard | `/dashboard` | Overview of current weight (EMA), fat%, lean mass, and weekly trend |
| Progress | `/progress` | Smoothed weight graph, fat/lean mass trend, deficit vs actual fat loss |
| Insights | `/insights` | Protein adherence, workout consistency, step averages, alerts |
| Goals | `/goals` | Set targets for weight, body fat, protein, calories, steps, workouts |
| Settings | `/settings` | Profile, account, timezone |

---

## Design Decisions

### Raw data is immutable
`DailyLog` entries are never modified after creation. If a user enters a correction, a new entry is created for the same date (latest entry wins). This preserves the full historical record and allows audit trails.

### Derived data lives separately
`ComputedMetric` is always recalculated from raw `DailyLog` and `WeeklyMetric` data. It is never manually edited. This separation ensures that if the algorithm is updated, historical computed metrics can be regenerated accurately.

### BIA is treated as a noisy signal
BIA (bioelectrical impedance) body fat readings from smart scales are systematically biased by hydration, glycogen, and timing. FitTrack does not trust raw BIA output. Instead, if BIA data is provided, it applies a hydration correction layer to produce a `trueFatPct` estimate stored in `ComputedMetric`.

### Confidence-weighted fat loss
Fat loss estimates are not purely calorie-based. They are weighted by a confidence score that reflects how consistently the user is hitting their protein, training, and step targets. Low confidence = less reliable estimate.

### Multi-user, personal accounts
Each user has a completely private data set. There are no shared views, coaching relationships, or admin overrides of user data. Authentication is credential-based (email + password).

---

## Reference Docs

| File | Contents |
|------|----------|
| `docs/tech-stack.md` | Full dependency list, testing approach, setup commands |
| `docs/folder-structure.md` | Annotated directory tree |
| `docs/database-schema.md` | All Prisma models, enums, and relationships |
| `docs/business-rules.md` | Algorithm specifications: EMA, confidence, fat loss, corrections |
| `docs/api-routes.md` | All API endpoints with request/response shapes |
| `docs/implementation-phases.md` | Build order with task checklists |
| `docs/features/01-*.md` through `06-*.md` | Per-module product briefs |
