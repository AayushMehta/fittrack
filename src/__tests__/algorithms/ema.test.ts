import { describe, it, expect } from 'vitest'
import { calcEMA } from '@/lib/algorithms/ema'

describe('calcEMA', () => {
  it('seeds with raw weight on first entry (no previous EMA)', () => {
    expect(calcEMA(80, null)).toBe(80)
  })

  it('applies α=0.3 correctly', () => {
    // 0.3 × 80 + 0.7 × 78 = 24 + 54.6 = 78.6
    expect(calcEMA(80, 78)).toBeCloseTo(78.6, 5)
  })

  it('converges toward the stable weight over many days', () => {
    let ema: number | null = null
    for (let i = 0; i < 30; i++) {
      ema = calcEMA(75, ema)
    }
    expect(ema).toBeCloseTo(75, 1)
  })

  it('responds faster to large weight spikes than simple average', () => {
    const ema = calcEMA(90, 70)
    expect(ema).toBeGreaterThan(70)
    expect(ema).toBeLessThan(90)
    expect(ema).toBeCloseTo(76, 0) // 0.3×90 + 0.7×70 = 27 + 49 = 76
  })

  it('supports custom alpha', () => {
    // α=0.5: 0.5×80 + 0.5×70 = 75
    expect(calcEMA(80, 70, 0.5)).toBe(75)
  })
})
