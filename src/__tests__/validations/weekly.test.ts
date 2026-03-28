import { describe, it, expect } from 'vitest'
import { weeklySchema } from '@/lib/validations/weekly'

describe('weeklySchema', () => {
  it('accepts a valid input with only the required weekStartDate', () => {
    const result = weeklySchema.safeParse({ weekStartDate: '2025-03-17' })
    expect(result.success).toBe(true)
  })

  it('rejects a missing weekStartDate', () => {
    const result = weeklySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects an invalid date format', () => {
    const result = weeklySchema.safeParse({ weekStartDate: '17-03-2025' })
    expect(result.success).toBe(false)
  })

  it('accepts all optional fields when valid', () => {
    const result = weeklySchema.safeParse({
      weekStartDate: '2025-03-17',
      waistCm: 82.5,
      benchPressPeak: 100,
      squatPeak: 120,
      deadliftPeak: 140,
      otherStrengthNotes: 'PR on overhead press',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative waistCm', () => {
    const result = weeklySchema.safeParse({ weekStartDate: '2025-03-17', waistCm: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects a negative lift value', () => {
    const result = weeklySchema.safeParse({ weekStartDate: '2025-03-17', benchPressPeak: -50 })
    expect(result.success).toBe(false)
  })
})
