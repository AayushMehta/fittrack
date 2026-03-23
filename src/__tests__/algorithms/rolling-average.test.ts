import { describe, it, expect } from 'vitest'
import { calcRollingAvg7d } from '@/lib/algorithms/rolling-average'

describe('calcRollingAvg7d', () => {
  it('returns null for fewer than 7 entries', () => {
    expect(calcRollingAvg7d([])).toBeNull()
    expect(calcRollingAvg7d([80, 79, 78])).toBeNull()
    expect(calcRollingAvg7d([80, 79, 78, 77, 76, 75])).toBeNull()
  })

  it('returns average of last 7 for exactly 7 entries', () => {
    const weights = [80, 79, 78, 77, 76, 75, 74]
    expect(calcRollingAvg7d(weights)).toBeCloseTo(77, 5)
  })

  it('uses only the last 7 when given more', () => {
    // First 3 are outliers (100 kg), last 7 average to 75
    const weights = [100, 100, 100, 78, 77, 76, 75, 74, 73, 72]
    expect(calcRollingAvg7d(weights)).toBeCloseTo(75, 5)
  })

  it('handles all identical weights', () => {
    const weights = [75, 75, 75, 75, 75, 75, 75]
    expect(calcRollingAvg7d(weights)).toBe(75)
  })
})
