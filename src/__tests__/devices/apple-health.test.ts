import { describe, it, expect } from 'vitest'
import { appleHealthAdapter } from '@/lib/devices/apple-health'

const validRecord = {
  date: '2025-03-01',
  weight: 78.5,
  steps: 8000,
  workedOut: true,
  workoutType: 'STRENGTH',
  caloriesIntake: 1950,
  proteinIntake: 155,
  sleepHours: 7.5,
}

describe('appleHealthAdapter.parse()', () => {
  it('returns empty array for non-array input', () => {
    expect(appleHealthAdapter.parse(null)).toEqual([])
    expect(appleHealthAdapter.parse({ records: [] })).toEqual([])
    expect(appleHealthAdapter.parse('csv data')).toEqual([])
  })

  it('parses a valid record', () => {
    const result = appleHealthAdapter.parse([validRecord])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ date: '2025-03-01', weight: 78.5, steps: 8000 })
  })

  it('skips records missing the required weight field', () => {
    const bad = { date: '2025-03-01', steps: 8000 }
    expect(appleHealthAdapter.parse([bad])).toHaveLength(0)
  })

  it('skips records with invalid date format', () => {
    const bad = { ...validRecord, date: '01-03-2025' }
    expect(appleHealthAdapter.parse([bad])).toHaveLength(0)
  })

  it('defaults workedOut to false when not provided', () => {
    const record = { date: '2025-03-01', weight: 78.5 }
    const result = appleHealthAdapter.parse([record])
    expect(result[0].workedOut).toBe(false)
  })

  it('handles a mixed array of valid and invalid records', () => {
    const records = [
      validRecord,
      { date: '2025-03-02' }, // missing weight — skip
      { date: 'bad-date', weight: 77 }, // bad date — skip
      { date: '2025-03-03', weight: 77.5 }, // valid
    ]
    const result = appleHealthAdapter.parse(records)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2025-03-01')
    expect(result[1].date).toBe('2025-03-03')
  })

  it('strips unknown fields from records', () => {
    const record = { ...validRecord, unknownField: 'ignore me' }
    const result = appleHealthAdapter.parse([record])
    expect(result[0]).not.toHaveProperty('unknownField')
  })
})
