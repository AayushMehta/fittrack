import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifyFitbitSignature, parseFitbitNotifications } from '@/lib/devices/fitbit'

function makeSignature(body: string, secret: string): string {
  return createHmac('sha1', `${secret}&`).update(body).digest('base64')
}

describe('verifyFitbitSignature()', () => {
  const secret = 'test-client-secret'
  const body = JSON.stringify([{ collectionType: 'activities', date: '2025-03-01' }])

  it('returns true for a valid signature', () => {
    const sig = makeSignature(body, secret)
    expect(verifyFitbitSignature(body, sig, secret)).toBe(true)
  })

  it('returns false for a tampered body', () => {
    const sig = makeSignature(body, secret)
    expect(verifyFitbitSignature(body + ' ', sig, secret)).toBe(false)
  })

  it('returns false for a wrong secret', () => {
    const sig = makeSignature(body, 'wrong-secret')
    expect(verifyFitbitSignature(body, sig, secret)).toBe(false)
  })

  it('returns false for an empty signature', () => {
    expect(verifyFitbitSignature(body, '', secret)).toBe(false)
  })
})

describe('parseFitbitNotifications()', () => {
  it('returns empty array for non-array input', () => {
    expect(parseFitbitNotifications(null)).toEqual([])
    expect(parseFitbitNotifications({})).toEqual([])
  })

  it('parses valid notifications', () => {
    const notifications = [
      { collectionType: 'activities', date: '2025-03-01', ownerId: 'user123', subscriptionId: 'sub1' },
    ]
    const result = parseFitbitNotifications(notifications)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2025-03-01')
    expect(result[0].ownerId).toBe('user123')
  })

  it('filters out entries missing required fields', () => {
    const notifications = [
      { collectionType: 'activities', date: '2025-03-01', ownerId: 'user1' }, // valid
      { collectionType: 'body' }, // missing ownerId and date — skip
      { date: '2025-03-01', ownerId: 'user1' }, // missing collectionType — skip
    ]
    expect(parseFitbitNotifications(notifications)).toHaveLength(1)
  })

  it('returns empty array for an empty notifications array', () => {
    expect(parseFitbitNotifications([])).toEqual([])
  })
})
