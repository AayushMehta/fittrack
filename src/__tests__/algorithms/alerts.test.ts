import { describe, it, expect } from 'vitest'
import { generateAlerts } from '@/lib/algorithms/alerts'

const base = {
  emaToday: 78,
  ema14dAgo: 78.5,
  confidenceScore: 70,
  proteinIntake: 160,
  dailyProteinGoal: 160,
  trueFatPct: 18,
  leanMassKg: 63,
  prevLeanMassKg: 63,
}

describe('generateAlerts', () => {
  it('returns no alerts for healthy metrics', () => {
    expect(generateAlerts(base)).toHaveLength(0)
  })

  it('flags plateau when EMA moves < 0.1 kg in 14 days', () => {
    const alerts = generateAlerts({ ...base, ema14dAgo: 78.05 })
    expect(alerts.some((a) => a.type === 'PLATEAU')).toBe(true)
  })

  it('flags fat loss too slow when losing < 0.1 kg/week', () => {
    const alerts = generateAlerts({ ...base, ema14dAgo: 78.1 })
    expect(alerts.some((a) => a.type === 'FAT_LOSS_TOO_SLOW')).toBe(true)
  })

  it('flags fat loss too fast when losing > 0.75 kg/week', () => {
    // 78 vs 80 over 14 days = 1 kg/week
    const alerts = generateAlerts({ ...base, ema14dAgo: 80 })
    expect(alerts.some((a) => a.type === 'FAT_LOSS_TOO_FAST')).toBe(true)
  })

  it('flags muscle loss when lean mass drops > 0.5 kg', () => {
    const alerts = generateAlerts({ ...base, leanMassKg: 62, prevLeanMassKg: 63 })
    expect(alerts.some((a) => a.type === 'MUSCLE_LOSS_RISK')).toBe(true)
  })

  it('flags low protein when below 80% of goal', () => {
    const alerts = generateAlerts({ ...base, proteinIntake: 100, dailyProteinGoal: 160 })
    expect(alerts.some((a) => a.type === 'LOW_PROTEIN')).toBe(true)
  })

  it('does not flag low protein when within 80%', () => {
    const alerts = generateAlerts({ ...base, proteinIntake: 135, dailyProteinGoal: 160 })
    expect(alerts.some((a) => a.type === 'LOW_PROTEIN')).toBe(false)
  })

  it('handles null ema14dAgo gracefully (no plateau/trend alerts)', () => {
    const alerts = generateAlerts({ ...base, ema14dAgo: null })
    expect(alerts.some((a) => a.type === 'PLATEAU')).toBe(false)
    expect(alerts.some((a) => a.type === 'FAT_LOSS_TOO_SLOW')).toBe(false)
    expect(alerts.some((a) => a.type === 'FAT_LOSS_TOO_FAST')).toBe(false)
  })
})
