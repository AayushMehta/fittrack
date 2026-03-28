# FitTrack — Business Logic Context

> Last updated: 2026-03-28
> Source of truth for: algorithms, data rules, invariants, epics, and physiological reasoning.
> Do not confuse with `docs/business-rules.md` (algorithm reference) — this document explains the *why* and ties rules to epics and user stories.

---

## Core Problem Statement

Consumer fitness apps show raw scale weight as if it represents fat change. It does not. Daily weight fluctuates 1–3 kg from water retention, glycogen loading, meal timing, and sodium — changes that have nothing to do with fat gain or loss. A user who eats a salty dinner and weighs in the next morning will see a number that looks like failure but is physiologically meaningless. Most apps let users draw these incorrect conclusions, which destroys motivation and produces bad decisions.

BIA (Bioelectrical Impedance Analysis) smart scales compound the problem. They estimate body fat by measuring how quickly an electrical current travels through tissue — a speed that is heavily influenced by hydration. A well-hydrated user looks leaner than they are. A dehydrated user looks fatter. Raw BIA output is systematically biased and should never be shown uncorrected.

FitTrack's business logic exists to eliminate both failure modes. It applies EMA smoothing to strip daily noise from weight data, hydration correction to strip measurement bias from BIA readings, and a confidence score to quantify how much to trust any given estimate. The result is a system that tells users what is physiologically true, not what the scale said this morning.

---

## Data Principles (Non-Negotiable Invariants)

These rules govern every data model, algorithm, API, and UI decision in FitTrack. They are not conventions — they are invariants. Any feature that violates them requires explicit product approval before implementation.

### Invariant 1: DailyLog Immutability

**Rule**: `DailyLog` entries are never updated after creation. The model has no `updatedAt` field. Corrections create a new entry for the same date; the latest `createdAt` wins in all queries.

**Why this rule exists**: Immutability creates an audit trail that prevents retroactive manipulation of physiological data. If a user "corrects" a weight entry that was actually accurate, the history is preserved. This is modeled after accounting ledger principles — you never erase, you always amend. It also means device-imported data (Apple Health, Fitbit) follows the same rules as manual entries: no silent overwrites.

**Introduced in**: Phase 1, Layer 3 (Daily Log epic)

**Affects**: Every algorithm that reads `DailyLog`. EMA seeding. Confidence sub-scores. Fat loss estimation. Device adapter imports.

**User story tied to this rule**:
- As a user who accidentally logged the wrong weight, I want to submit a correction so that my trend line uses the right data without erasing the original entry.

---

### Invariant 2: ComputedMetric Is Derived-Only

**Rule**: `ComputedMetric` is never user-editable. It is always recalculated from `DailyLog` + `WeeklyMetric` + `UserGoal` data. Users cannot manually set `emaWeight`, `confidenceScore`, `trueFatPct`, or any other derived field.

**Why this rule exists**: If derived values were editable, users could set their confidence score to 100 without logging protein or workouts. The physiological estimates would become meaningless. Separating raw and derived data also means the entire derived layer can be recomputed from scratch if an algorithm changes — there is no "locked in" derived state.

**Introduced in**: Phase 1, Layer 4 (Weight Smoothing Engine epic)

**Recompute triggers**:
| Trigger | Scope | Mode |
|---------|-------|------|
| New `DailyLog` created | Today only | Fire-and-forget |
| `DailyLog` corrected (PUT) | Today only | Fire-and-forget |
| `WeeklyMetric` upserted | Today only | Fire-and-forget |
| `UserGoal` updated | Today only | Fire-and-forget |

---

### Invariant 3: Null Is Not Zero

**Rule**: An absent optional field (`null`) means "not logged", not "zero". Algorithms must exclude null values rather than treat them as zero.

**Why this rule exists**: `proteinIntake: 0` means the user ate zero protein — a valid and concerning data point. `proteinIntake: null` means the user did not log nutrition that day — a completely different situation. If null were treated as zero, users who don't track macros would always have a protein score of 0 / target = 0, which would make their confidence scores artificially low and fat loss estimates untrustworthy. The same applies to `steps` (null ≠ zero steps walked) and `caloriesIntake` (null ≠ zero calories consumed).

**Introduced in**: Phase 1, Layer 3 (Daily Log epic)

**Affects**: `proteinScore` (null → score excluded, not zero). `activityScore` (null step entries excluded; fewer than 3 non-null entries → score = 0). Fat loss gate (null calorie days don't count toward the 4/7 threshold). Rolling average (null weight days excluded from mean).

---

### Invariant 4: BIA Readings Are Never Surfaced Uncorrected

**Rule**: Raw `bodyFatPct` from a BIA scale is never displayed directly to users. It is always run through the hydration correction formula before display. `ComputedMetric.trueFatPct` is the canonical fat% value for all UI, alerts, and downstream calculations.

**Why this rule exists**: BIA measures body fat by estimating how quickly electrical current travels through tissue. This speed is heavily affected by hydration — well-hydrated tissue conducts faster, making the body appear leaner than it is. A user who drinks 2 liters of water before measuring will see a falsely low fat% reading. Showing this uncorrected would mislead users into thinking they've lost fat when they've only changed hydration. Raw `bodyFatPct` is stored in `DailyLog` to preserve the original measurement; the correction is applied at compute time, not at write time.

**Hydration correction formula**:
```
deviation = bodyWaterPct - 60
correctionFactor = deviation × 0.5
trueFatPct = rawBiaFatPct - correctionFactor
```

Baseline body water: 60%. Correction magnitude: ±0.5% fat per 1% deviation from baseline. Floor: `Math.max(0, trueFatPct)`. Fallback: if `bodyWaterPct` is null, `trueFatPct = rawBiaFatPct` (no correction).

**Introduced in**: Phase 2 (Progress Intelligence & Insights epic)

---

### Invariant 5: Confidence Gates Estimates

**Rule**: Fat loss estimation returns `null` unless the user has logged `caloriesIntake` on at least 4 of the last 7 days.

**Why this rule exists**: The fat loss formula requires a meaningful calorie deficit: `estimatedFatLoss_kg = (weeklyCalorieDeficit / 7700) × (confidenceScore / 100)`. If a user only logs calories on 2 days, the "weekly deficit" is based on incomplete data. Showing a number would give false precision. The 4/7 threshold is the minimum needed for a statistically defensible weekly estimate. FitTrack prioritizes honest uncertainty over false precision.

**Introduced in**: Phase 2 (Progress Intelligence & Insights epic)

---

## Epics and User Stories

Each epic maps to one or more implementation phase layers. Epics are ordered by build dependency — each epic's "Done when" gate is what enables the next.

---

### Epic 1: Foundation & Auth
**Phase**: Phase 1, Layers 1–2
**Status**: Done
**Goal**: A user can register, log in, and have their routes protected.

**Why we built this first**: Every subsequent layer requires an authenticated user and a validated schema. Auth is the foundation — no feature can exist without it. The Prisma schema was defined in full in Layer 1 (all 5 models) so that all subsequent layers build on a stable data contract.

**User stories**:
| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-F1 | new user | register with email and password | I can start tracking my fitness |
| US-F2 | returning user | log in securely | I can access my personal data |
| US-F3 | logged-in user | be automatically redirected from auth pages | I don't see the login screen after I'm authenticated |

**Business rules activated**: None — foundation only. The `api()` helper and `ApiError` class established the standard error contract (`{ error: string, details?: ZodError[] }`) used by every subsequent route.

**Done when**: A user can register, log in, and be redirected to `/dashboard`.

---

### Epic 2: Daily Log
**Phase**: Phase 1, Layer 3
**Status**: Done
**Goal**: Users can log fasted morning weight plus optional nutrition, activity, and BIA body composition data.

**Why we built this second**: The daily log is the raw data source for every algorithm. Without it, there is nothing to compute. Weight is the only required field; everything else is optional to lower the barrier to entry for the Consistency Seeker persona.

**User stories**:
| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-DL1 | user | log my morning weight every day | the system can smooth my trend and detect plateaus |
| US-DL2 | macro tracker | log calories and protein intake | the system can score my nutrition adherence and estimate fat loss |
| US-DL3 | BIA scale user | log `bodyFatPct`, `bodyWaterPct`, and `skeletalMuscleMass` | the system can compute hydration-corrected fat% |
| US-DL4 | active user | log steps and whether I worked out | the system can score my activity adherence |
| US-DL5 | user who made a mistake | submit a correction for today's date | the latest entry is used while the original is preserved |

**Business rules activated**:
- Immutability invariant (Invariant 1)
- Null ≠ zero invariant (Invariant 3)
- Validation bounds: weight 20–300 kg, `bodyFatPct` 3–60%, `bodyWaterPct` 30–80%

**Done when**: A user can submit a daily log entry and see it in their log history (last 14 days).

---

### Epic 3: Weight Smoothing Engine
**Phase**: Phase 1, Layer 4
**Status**: Done
**Goal**: Raw daily weight is processed into EMA and 7-day rolling average, stored in `ComputedMetric`.

**Why we built this immediately after Daily Log**: Raw weight is noisy and anxiety-inducing. The first time a user logs their weight and sees +0.8 kg the next day (after a salty meal), they lose trust in the app. Smoothing must exist from the very first entry so the EMA trend is available on the dashboard from day one.

**EMA formula and rationale**:
```
EMA_today = (weight_today × 0.3) + (EMA_yesterday × 0.7)
```
- Alpha = 0.3: balances responsiveness (detects real fat loss in 2–3 weeks) with noise reduction (ignores 1-day spikes from meals or water)
- Seeding: the first entry seeds `emaWeight = weight` (no prior value to blend)
- Why EMA over simple average: EMA weights recent data more heavily — it moves faster when genuine change is happening and smooths faster when the trend reverses

**7-day rolling average rationale**:
- Simpler signal for users unfamiliar with EMA
- Requires ≥7 entries — `rollingAvg7d` is `null` until threshold is met
- Displayed alongside EMA as a dashed line on progress charts

**Business rules activated**:
- EMA seeding rule (first entry special case)
- `ComputedMetric` derived-only invariant (Invariant 2)
- Recompute trigger: fire-and-forget `recomputeMetrics(userId, today)` on every `DailyLog` save

**User stories**:
| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-WS1 | user with daily weight fluctuations | see my smoothed EMA trend | I'm not misled by day-to-day noise from meals or water |
| US-WS2 | new user on day 1 | see my EMA weight immediately | the dashboard shows meaningful data from the first entry |
| US-WS3 | user with 7+ days logged | see my 7-day rolling average | I have a simpler trend line alongside EMA |

**Done when**: A user can log 7+ days of weight and see their EMA trend and rolling average on the dashboard.

---

### Epic 4: Goals
**Phase**: Phase 1, Layer 5
**Status**: Done
**Goal**: Users can set fitness targets (`targetWeight`, `targetBodyFatPct`, `dailyCalorieTarget`, `dailyProteinTarget`, `dailyStepsTarget`, `weeklyWorkoutTarget`) that feed directly into confidence scoring.

**Why we built Goals before Dashboard**: The confidence score formula requires goals as denominators — `proteinScore = (actualProtein / dailyProteinTarget) × 100`. Without goals, the dashboard always shows `confidenceScore = 0` and fat loss estimates are suppressed. Goals must exist before the dashboard can show meaningful data. Layer 5 depends on Layer 2 (auth) but not on Layer 3 or 4 — it was sequenced here to unblock Layer 6.

**User stories**:
| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-G1 | user starting a cut | set my daily calorie and protein targets | the system can score my adherence and estimate fat loss |
| US-G2 | user with a wearable | set my daily steps target | the system can score my activity against a meaningful goal |
| US-G3 | user with a training schedule | set my weekly workout target | the training score reflects my actual goals, not a generic default |
| US-G4 | user who updates their targets mid-program | change my goals | my confidence scores reflect my current, not outdated, targets |

**Business rules activated**:
- Confidence score denominators: `dailyProteinTarget`, `dailyStepsTarget`, `weeklyWorkoutTarget`
- Default fallbacks: `weeklyWorkoutTarget` defaults to 3 if null; `dailyStepsTarget` defaults to 8000 if null
- Fat loss estimation prerequisite: `dailyCalorieTarget` required for `weeklyCalorieDeficit` computation
- Goals are a single-row upsert per user (`UserGoal`). No goal history is stored.

**Done when**: A user can save goals and see them reflected in their confidence score breakdown on the dashboard.

---

### Epic 5: Dashboard
**Phase**: Phase 1, Layer 6
**Status**: Done
**Goal**: Users see their current physiological state at a glance — `emaWeight`, `trueFatPct`, `estimatedLeanMass`, `confidenceScore`, `weeklyEmaDelta`, and active alerts.

**Why the dashboard is the culmination of Phase 1**: It is the read-only synthesis of everything computed. It only has value once EMA (Layer 4) and Goals (Layer 5) are in place. The dashboard surfaces `ComputedMetric` data; it does not trigger computation itself.

**User stories**:
| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-DB1 | daily user | see my current smoothed weight on login | I get immediate feedback without checking raw, noisy numbers |
| US-DB2 | user tracking body composition | see my `trueFatPct` (corrected) and estimated lean mass | I know my actual body composition, not a biased BIA reading |
| US-DB3 | user who wants to trust the data | see my confidence score | I know how reliable today's fat loss estimate is |
| US-DB4 | user who may be plateauing | see active alerts | I get proactive guidance before I lose motivation |
| US-DB5 | new user with no logs yet | see an empty state banner | I know I need to go to `/log` to get started |

**Business rules activated**:
- BIA invariant (Invariant 4): `trueFatPct` always displayed, never raw `bodyFatPct`
- Confidence score display (0–100%)
- `weeklyEmaDelta`: today's `emaWeight` minus `emaWeight` 7 days ago. Negative = weight loss.
- Alerts from `ComputedMetric.alerts` shown as dismissible banners
- Empty state: no data → prompt to `/log`
- `rollingAvg7d` shown as "N/A" if fewer than 7 entries exist

**Done when**: A user who has logged 7+ days sees smoothed weight trend, EMA, `trueFatPct`, confidence score, and any active alerts on the dashboard.

---

### Epic 6: Progress Intelligence & Insights
**Phase**: Phase 2
**Status**: Done
**Goal**: Historical body composition trends, fat mass vs lean mass charts, confidence scoring, fat loss estimation, behavioral adherence metrics, and intelligent decision engine alerts.

**Why Phase 2 follows Phase 1**: Intelligence requires data history. Confidence scoring, fat loss estimation, hydration correction, and plateau detection all require multi-day data. Phase 1 creates the collection and display foundation; Phase 2 adds the full analytical layer.

**User stories**:
| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-PI1 | user on a 12-week cut | see my fat mass and lean mass as separate trend lines | I know whether I'm losing fat, muscle, or both |
| US-PI2 | user 3 weeks into a stall | receive a plateau alert | I know to adjust my approach before losing motivation |
| US-PI3 | user with inconsistent protein tracking | see my protein adherence % | I understand why my fat loss estimates are unreliable |
| US-PI4 | user losing weight too fast | receive a muscle loss risk alert | I increase calories before damaging my lean mass |
| US-PI5 | user with a BIA scale | log weekly waist and strength metrics | I track non-scale progress signals |
| US-PI6 | user wanting to understand their data | see a calorie deficit vs fat loss comparison chart | I can see whether my estimated deficit is producing expected results |

**Business rules activated**:
- Full confidence score formula: `(proteinScore + trainingScore + activityScore) / 3`
- Fat loss estimation: `(weeklyCalorieDeficit / 7700) × (confidenceScore / 100)`
- Fat loss gate (Invariant 5): ≥4 calorie days in last 7, else `null`
- Lean mass tracking: `estimatedLeanMass = emaWeight - estimatedFatMass`
- Fat mass seeding: if `bodyFatPct` available on first entry, `estimatedFatMass = weight × (bodyFatPct / 100)`
- Plateau detection: `|emaWeight_today - emaWeight_14daysAgo| < 0.1 kg` (requires ≥15 `ComputedMetric` entries)
- Alert types: `PLATEAU`, `FAT_LOSS_TOO_SLOW`, `FAT_LOSS_TOO_FAST`, `MUSCLE_LOSS_RISK`, `LOW_PROTEIN`, `bia_hydration`
- Muscle loss risk trigger: `estimatedLeanMass` decreases > 0.5 kg vs 7 days ago
- Low protein trigger: today's `proteinIntake` below 80% of `dailyProteinTarget`
- BIA hydration alert trigger: `|bodyWaterPct - 60| > 5`
- Activity score insufficient data rule: fewer than 3 non-null step entries in last 7 days → `activityScore = 0`
- Weekly metrics: `WeeklyMetric` upserted per Monday `weekStartDate`; triggers recompute

**Done when**: Users see confidence scores, `trueFatPct`, estimated lean mass, plateau alerts, and protein/workout/step adherence breakdown.

---

### Epic 7: Settings, AI Insights & Device Integration
**Phase**: Phase 3
**Status**: Done
**Goal**: Account management, AI-powered analysis sidebar, and device data ingestion (Apple Health import, Fitbit webhook).

**Why Phase 3 is last**: Settings, AI, and integrations are value multipliers — they make the core intelligence more accessible, not more accurate. They depend on all Phase 1 and Phase 2 data being stable.

**Why AI was added**: FitTrack's algorithms are deterministic but narrow — they produce numbers, not explanations. The AI sidebar (Claude) reads the user's 30-day snapshot (`DailyLog` + `ComputedMetric` + `UserGoal` + `WeeklyMetric`) and provides natural-language interpretation: pattern recognition, root cause analysis, and actionable recommendations. It does not replace algorithms — it explains them in context.

**Why device integration was added**: Manual data entry is a compliance bottleneck, particularly for the Consistency Seeker persona. Apple Health and Fitbit can auto-populate `steps`, `weight`, and body composition data, reducing logging friction. Integration was built in Phase 3 rather than earlier because the `DailyLog` schema needed to be stable first — adding adapters during schema iteration would cause constant churn.

**User stories**:
| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-S1 | user who wants AI feedback | open the AI sidebar | I get a natural-language explanation of my trends and recommendations |
| US-S2 | Apple Watch user | import my step data from Apple Health | I don't have to log steps manually every day |
| US-S3 | Fitbit user | connect my Fitbit to auto-sync steps and body composition | my data stays current without manual entry |
| US-S4 | user wanting to leave | permanently delete my account and all data | my health data is not retained |
| US-S5 | user | update my name, email, and timezone | my profile reflects my current information |

**Business rules activated**:
- AI context assembly: `buildAIContext` reads 30-day `DailyLog` + `ComputedMetric` + `UserGoal` + `WeeklyMetric` snapshot
- AI modes: `weekly` (summary), `root-cause` (why is this happening?), `recommendations` (what should I do?), `narrative` (story-format)
- Device adapter interface (`DeviceAdapter`): maps device data to `DailyLog` fields. Immutability applies to device-imported data (same rules as manual entries)
- Fitbit HMAC-SHA1 webhook verification: all incoming Fitbit notifications verified against `FITBIT_CLIENT_SECRET` before processing
- Account cascade delete: removes all `DailyLog`, `WeeklyMetric`, `ComputedMetric`, `UserGoal`, and `User` records. S3 photos not auto-deleted (scheduled cleanup deferred).

**Done when**: Users can manage account, access AI analysis, and optionally connect a wearable.

---

## Algorithm Reference Map

Maps every algorithm to the epic that introduced it, the problem it solves, and where it lives in code.

| Algorithm | Introduced In | Problem Solved | Formula | File |
|-----------|--------------|---------------|---------|------|
| EMA (α=0.3) | Epic 3 | Eliminates day-to-day weight noise | `EMA = (weight × 0.3) + (prevEMA × 0.7)` | `src/lib/algorithms/ema.ts` |
| 7-day rolling average | Epic 3 | Simpler trend signal; requires ≥7 entries | Mean of last 7 `DailyLog.weight` | `src/lib/algorithms/rolling-average.ts` |
| Confidence score | Epic 6 | Quantifies estimate reliability | `(proteinScore + trainingScore + activityScore) / 3` | `src/lib/algorithms/confidence.ts` |
| Hydration correction (BIA fix) | Epic 6 | Corrects systematic BIA bias from hydration | `trueFatPct = rawFatPct - (bodyWaterPct - 60) × 0.5` | `src/lib/algorithms/body-composition.ts` |
| Fat mass estimation | Epic 6 | Tracks fat mass as running total from deficit | `estimatedFatMass_today = estimatedFatMass_yesterday - estimatedFatLoss_kg` | `src/lib/algorithms/body-composition.ts` |
| Lean mass estimation | Epic 6 | Tracks muscle retention during cut | `estimatedLeanMass = emaWeight - estimatedFatMass` | `src/lib/algorithms/body-composition.ts` |
| Fat loss estimation | Epic 6 | Converts calorie deficit to expected fat loss | `(weeklyCalorieDeficit / 7700) × (confidenceScore / 100)` | `src/lib/algorithms/body-composition.ts` |
| Plateau detection | Epic 6 | Detects weight stall to prompt strategy change | `|emaWeight_today - emaWeight_14daysAgo| < 0.1 kg` | `src/lib/algorithms/alerts.ts` |
| Alert generation | Epic 6 | Proactive guidance before user disengages | Multiple threshold checks (plateau, fat loss pace, muscle loss, protein) | `src/lib/algorithms/alerts.ts` |

Full algorithm specifications (formulas, null-handling, bounds): `docs/business-rules.md`.

---

## Decision Log

Records significant business logic decisions made during the build, with reasoning. Decision log entries are irreversible — if a decision is reversed, a new entry documents the reversal and why.

| # | Decision | Rationale | Introduced In |
|---|----------|-----------|--------------|
| D1 | Alpha = 0.3 for EMA | Balances reactivity (detects real fat loss in 2–3 weeks) with noise rejection (ignores 1-day spikes from meals or water). Higher alpha = too noisy; lower = too slow to reflect real change. | Epic 3 |
| D2 | Immutability via new rows, not updates | Prevents retroactive data manipulation. Models accounting ledger pattern. Original entry preserved as audit trail. Applies equally to manual and device-imported entries. | Epic 2 |
| D3 | `ComputedMetric` never user-editable | Derived values are only meaningful if they reflect raw data. Editable derived values would let users fake confidence scores and fat loss estimates. | Epic 3 |
| D4 | Fat loss gate: ≥4 calorie days in 7 | Calorie deficit across fewer than 4 days cannot produce a statistically meaningful weekly estimate. Showing a number would give false precision. | Epic 6 |
| D5 | BIA correction at ±0.5% per 1% water deviation | Physiological literature estimates BIA error of ~0.5% fat per 1% body water deviation. Conservative correction prevents over-adjustment while still correcting systematic bias. | Epic 6 |
| D6 | Plateau threshold: 0.1 kg EMA delta over 14 days | Under 0.1 kg change over 14 days is physiologically indistinguishable from true zero progress given typical scale measurement error (±0.1–0.2 kg). | Epic 6 |
| D7 | Confidence formula: equal weighting (÷ 3) | Equal weighting reflects the product opinion that protein adherence, training consistency, and activity level are equally important for body recomposition quality. No sub-score is privileged. | Epic 6 |
| D8 | No Prisma enums (SQLite limitation) | SQLite does not support native enum columns. `workoutType` is stored as `String?` and validated at the application layer via Zod. Alert severity is stored as a JSON string in the `alerts` array. | Epic 1 |
| D9 | S3 skipped in simplified stack | Progress photos add UX value but are not critical path for algorithmic accuracy. Stubbed out (`progressPhotoUrl String?` in schema) to allow future addition without schema migration. | Epic 7 |
| D10 | AI sidebar responses not persisted | Storage and retrieval of AI responses adds a new model, new API, and new complexity without improving physiological accuracy. Sessions are ephemeral; the underlying data is persistent and re-analyzable. | Epic 7 |
| D11 | Recompute scope is today-only | Recomputing all historical `ComputedMetric` rows on every trigger would be O(n) with unbounded cost as data grows. Today-only scope is O(1). Historical recompute requires an explicit migration. | Epic 3 |
| D12 | Fitbit webhook-only (no OAuth UI) | The webhook receiver is the highest-value, lowest-complexity integration path. The OAuth connection flow (requiring redirect handling, token storage, and UI) is a separate concern deferred to a future epic. | Epic 7 |
| D13 | Activity score: 0 when fewer than 3 step entries | Fewer than 3 step entries in 7 days is insufficient to compute a meaningful average. Returning 0 rather than null keeps the confidence formula consistent (null would require special-casing the ÷ 3 denominator). | Epic 6 |

---

## Known Business Logic Gaps

Areas where the current business logic is incomplete or has known limitations. These are documented, not ignored.

| # | Gap | Impact | Notes |
|---|-----|--------|-------|
| G1 | No onboarding logic | New users see `confidenceScore = 0`, no estimates, empty charts, no guidance | No first-run flow to guide goal setup or first log entry |
| G2 | Recompute scope is today-only | Historical `ComputedMetric` rows are not updated when goals change | Only today's record reflects updated `dailyProteinTarget`, `dailyStepsTarget`, etc. |
| G3 | No multi-device conflict resolution | If Apple Health and manual entry exist for the same date, latest `createdAt` wins silently | No user visibility, no override UI, no conflict audit |
| G4 | Fat loss estimation ignores macronutrient composition | Only calorie deficit is used; the protein-sparing effect on fat vs muscle loss is not modeled | Future: protein intake could adjust fat loss estimate quality |
| G5 | Confidence score clamped at 100 | Over-achievers are not rewarded for surplus adherence beyond target | By design (adherence > 100% has diminishing returns), but limits differentiation for power users |
| G6 | No retroactive algorithm update migration | If EMA alpha, hydration correction constant, or plateau threshold changes, old `ComputedMetric` rows are not recomputed | Requires explicit migration plan and product decision before any algorithm constant change |
| G7 | No goal history | `UserGoal` is a single upsert row — only current goals are stored | Historical confidence scores computed against outdated goals cannot be retroactively corrected |
| G8 | Fitbit OAuth not implemented | Webhook receiver is ready but no UI to initiate connection | Blocks Fitbit integration for end users until OAuth flow is built |
