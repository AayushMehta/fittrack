import { describe, it, expect } from 'vitest'
import { calcSubScore, calcConfidence } from '@/lib/algorithms/confidence'

describe('calcSubScore', () => {
  it('returns 100 when actual equals goal', () => {
    expect(calcSubScore(160, 160)).toBe(100)
  })

  it('caps at 100 when actual exceeds goal', () => {
    expect(calcSubScore(200, 160)).toBe(100)
  })

  it('scales linearly below goal', () => {
    expect(calcSubScore(80, 160)).toBeCloseTo(50, 5)
    expect(calcSubScore(0, 160)).toBe(0)
  })

  it('returns 0 when goal is 0 or negative', () => {
    expect(calcSubScore(100, 0)).toBe(0)
    expect(calcSubScore(100, -1)).toBe(0)
  })
})

describe('calcConfidence', () => {
  it('averages three scores', () => {
    expect(calcConfidence(60, 80, 100)).toBeCloseTo(80, 5)
  })

  it('returns 0 when all scores are 0', () => {
    expect(calcConfidence(0, 0, 0)).toBe(0)
  })

  it('returns 100 when all scores are 100', () => {
    expect(calcConfidence(100, 100, 100)).toBe(100)
  })
})
