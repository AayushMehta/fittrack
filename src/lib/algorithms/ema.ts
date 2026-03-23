/**
 * Exponential Moving Average
 * Formula: EMA_today = α × weight_today + (1 - α) × EMA_yesterday
 * Default α = 0.3 (more weight on recent, some smoothing)
 *
 * For the very first entry (no previous EMA), seed with today's raw weight.
 */
export function calcEMA(todayWeight: number, prevEMA: number | null, alpha = 0.3): number {
  if (prevEMA === null) return todayWeight
  return alpha * todayWeight + (1 - alpha) * prevEMA
}
