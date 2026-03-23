# Business Rules

All algorithmic logic governing how FitTrack processes raw input into physiological estimates. Every rule here has a corresponding implementation in `src/lib/algorithms/`.

---

## 1. Weight Smoothing

### Exponential Moving Average (EMA)

**Purpose**: Eliminate day-to-day noise from water, food, and glycogen fluctuations.

**Formula**:
```
EMA_today = (weight_today × 0.3) + (EMA_yesterday × 0.7)
```

**Seeding rule**: The first ever `DailyLog` entry for a user seeds `EMA = weight`. There is no prior EMA to blend.

**Alpha value**: 0.3 (smoothing factor). Higher alpha = more reactive to recent data. Lower = smoother but slower to reflect real change.

**Stored in**: `ComputedMetric.emaWeight`

---

### 7-Day Rolling Average

**Purpose**: Alternative smoothing signal that is easier to explain to users.

**Formula**: Mean of the last 7 days of `DailyLog.weight` (inclusive of today).

**Minimum data requirement**: Requires at least 7 `DailyLog` entries. `rollingAvg7d` is `null` until 7 entries exist.

**Stored in**: `ComputedMetric.rollingAvg7d`

---

## 2. Confidence Score

**Purpose**: Weight the reliability of fat loss estimates. A user who is tracking protein, training, and staying active produces more reliable estimates than one who only logs weight.

**Formula**:
```
confidenceScore = (proteinScore + trainingScore + activityScore) / 3
```

All sub-scores are 0–100. Overall `confidenceScore` is 0–100.

### Protein Score

```
proteinScore = clamp(actualProtein / goalProtein, 0, 1) × 100
```

- `actualProtein`: `DailyLog.proteinIntake` for today
- `goalProtein`: `UserGoal.dailyProteinTarget`
- If `goalProtein` is null or 0 → `proteinScore = 0`
- If `actualProtein` is null → `proteinScore = 0`

### Training Score

```
workoutsThisWeek = count of DailyLog where workedOut=true in the last 7 days
trainingScore = clamp(workoutsThisWeek / weeklyWorkoutTarget, 0, 1) × 100
```

- `weeklyWorkoutTarget`: `UserGoal.weeklyWorkoutTarget`
- If `weeklyWorkoutTarget` is null → use default of 3
- Calculated using a rolling 7-day window ending today

### Activity Score

```
avgSteps7d = mean of DailyLog.steps for last 7 days (null entries excluded)
activityScore = clamp(avgSteps7d / dailyStepsTarget, 0, 1) × 100
```

- `dailyStepsTarget`: `UserGoal.dailyStepsTarget`
- If `dailyStepsTarget` is null → use default of 8000
- If fewer than 3 step entries in the last 7 days → `activityScore = 0` (insufficient data)

---

## 3. Fat Loss Estimation

**Purpose**: Estimate true weekly fat loss from calorie deficit, adjusted by confidence.

**Formula**:
```
estimatedFatLoss_kg = (weeklyCalorieDeficit / 7700) × (confidenceScore / 100)
```

- `weeklyCalorieDeficit`: sum of (dailyCalorieTarget - caloriesIntake) over last 7 days
- `7700`: kcal per kg of fat (physiological constant)
- `confidenceScore / 100`: normalise to 0–1 multiplier

**Prerequisite**: Requires at least 4 days of `caloriesIntake` logged in the last 7 days. If fewer days are available, fat loss estimation is skipped (`null`).

**Fat mass tracking**:
```
estimatedFatMass_today = estimatedFatMass_yesterday - estimatedFatLoss_kg
```

Seed: If `bodyFatPct` is available on the first entry, seed `estimatedFatMass = weight × (bodyFatPct / 100)`. Otherwise, fat mass tracking is deferred until BIA data is available.

**Stored in**: `ComputedMetric.estimatedFatMass`

---

## 4. Lean Mass Estimation

**Purpose**: Track muscle retention alongside fat loss.

**Formula**:
```
estimatedLeanMass = emaWeight - estimatedFatMass
```

Only calculable when `estimatedFatMass` is available.

**Muscle retention indicator**: Lean mass trend should be stable or increasing during a cut. If `estimatedLeanMass` decreases by > 0.3 kg/week, a muscle loss risk alert is generated.

**Stored in**: `ComputedMetric.estimatedLeanMass`

---

## 5. Hydration Correction (BIA Fix)

**Purpose**: Correct the systematic bias in BIA body fat readings caused by hydration status.

**Baseline body water percentage**: 60%

**Correction formula**:
```
deviation = bodyWaterPct - 60
correctionFactor = deviation × 0.5   // 0.5% fat correction per 1% water deviation
trueFatPct = rawBiaFatPct - correctionFactor
```

**Logic explanation**:
- When hydration is high (`bodyWaterPct > 60%`), BIA underestimates fat% (body appears leaner). We correct upward by subtracting a negative correction → trueFatPct > rawFatPct.
- When hydration is low (`bodyWaterPct < 60%`), BIA overestimates fat% (body appears fatter). We correct downward → trueFatPct < rawFatPct.

**Bounds**: `trueFatPct` is clamped to `[3%, 60%]` — physiologically valid range.

**Fallback**: If `bodyWaterPct` is not logged, `trueFatPct = rawBiaFatPct` (no correction applied).

**Stored in**: `ComputedMetric.trueFatPct`

---

## 6. Plateau Detection

**Purpose**: Alert users when weight loss has stalled so they can adjust their approach.

**Formula**:
```
ema14dAgo = ComputedMetric.emaWeight for date = today - 14 days
delta = |emaWeight_today - ema14dAgo|
IF delta < 0.1 kg → plateau detected
```

**Minimum data requirement**: Requires ≥ 15 `ComputedMetric` entries. No plateau alert is generated before this threshold.

**Alert shape**:
```json
{ "type": "plateau", "message": "Weight hasn't changed in 14 days. Consider adjusting calories or training.", "severity": "warning" }
```

---

## 7. Decision Engine Alerts

Alerts are generated and stored in `ComputedMetric.alerts` (JSON array). Multiple alerts can coexist.

### Alert: Fat Loss Too Slow

**Trigger**: Weekly EMA delta < 0.2 kg/week for two consecutive weeks, AND user has a `targetWeight` or `targetBodyFatPct` set.

```json
{ "type": "fat_loss_slow", "message": "Fat loss has slowed. Try reducing daily intake by ~100 kcal.", "severity": "info" }
```

### Alert: Fat Loss Too Fast

**Trigger**: Weekly EMA delta > 1.0 kg/week for one week.

```json
{ "type": "fat_loss_fast", "message": "You're losing weight faster than recommended. Increase intake by ~100 kcal to protect muscle.", "severity": "warning" }
```

### Alert: Muscle Loss Risk

**Trigger**: `estimatedLeanMass` decreases by > 0.3 kg in 7 days.

```json
{ "type": "muscle_loss_risk", "message": "Lean mass is dropping. Increase protein intake and ensure you're resistance training.", "severity": "warning" }
```

### Alert: Low Protein

**Trigger**: `proteinScore < 60` for 7 consecutive days.

```json
{ "type": "low_protein", "message": "Protein intake has been below target for 7 days. Prioritise protein to retain muscle.", "severity": "info" }
```

### Alert: Hydration Affecting BIA

**Trigger**: `|bodyWaterPct - 60| > 5` on the current day.

```json
{ "type": "bia_hydration", "message": "Hydration is significantly off baseline. BIA readings may be inaccurate today.", "severity": "info" }
```

---

## 8. Computation Trigger

`ComputedMetric` is recalculated whenever:
1. A new `DailyLog` is created (POST `/api/logs`)
2. A new `WeeklyMetric` is created or updated
3. `UserGoal` is updated (changes confidence sub-score denominators)
4. User explicitly triggers recalculation (GET `/api/computed` with `recalculate=true`)

Computation is synchronous for the current day's entry. Historical recomputation (e.g. after a goal update) is batched and may be asynchronous.

---

## 9. Data Accuracy Principles

1. **Always store raw data** — `DailyLog` fields are never modified, never inferred.
2. **Never overwrite raw data** — corrections create new entries, not updates.
3. **Derived data stored separately** — `ComputedMetric` is always re-derivable from raw data.
4. **Null means absent, not zero** — `proteinIntake: null` means "not logged", not "0g protein". Algorithms must treat null inputs as absent.
5. **No retroactive overwriting** — when the algorithm is updated, old `ComputedMetric` rows are not silently overwritten. A migration plan is required.
