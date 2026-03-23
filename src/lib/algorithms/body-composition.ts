/**
 * Hydration-corrected body fat percentage.
 *
 * BIA scales are inaccurate when hydration deviates from the population average (~60%).
 * Correction: ±0.5% fat per 1% deviation in body water.
 *
 * If bodyWaterPct > 60 → person is over-hydrated → BIA underestimates fat → adjust up
 * If bodyWaterPct < 60 → person is under-hydrated → BIA overestimates fat → adjust down
 *
 * Returns null if any input is null/undefined.
 */
export const NORMAL_BODY_WATER_PCT = 60

export function calcTrueFatPct(
  biaFatPct: number | null | undefined,
  bodyWaterPct: number | null | undefined,
): number | null {
  if (biaFatPct == null || bodyWaterPct == null) return null
  const deviation = bodyWaterPct - NORMAL_BODY_WATER_PCT
  const correction = deviation * 0.5
  return Math.max(0, biaFatPct - correction)
}

export function calcFatMass(weightKg: number, fatPct: number | null): number | null {
  if (fatPct == null) return null
  return weightKg * (fatPct / 100)
}

export function calcLeanMass(weightKg: number, fatPct: number | null): number | null {
  if (fatPct == null) return null
  return weightKg * (1 - fatPct / 100)
}
