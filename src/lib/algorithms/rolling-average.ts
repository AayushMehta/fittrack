/**
 * 7-day simple rolling average.
 * Returns null if fewer than 7 data points are provided.
 * Input: array of weights (most recent last), uses last 7.
 */
export function calcRollingAvg7d(weights: number[]): number | null {
  if (weights.length < 7) return null
  const last7 = weights.slice(-7)
  return last7.reduce((sum, w) => sum + w, 0) / 7
}
