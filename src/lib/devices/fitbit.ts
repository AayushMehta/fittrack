import { createHmac } from 'crypto'

/**
 * Verify Fitbit's HMAC-SHA1 request signature.
 *
 * Fitbit signs webhook POST bodies with:
 *   key    = clientSecret + "&"
 *   digest = base64(HMAC-SHA1(key, body))
 *
 * The signature arrives in the X-Fitbit-Signature header.
 */
export function verifyFitbitSignature(
  body: string,
  signature: string,
  clientSecret: string,
): boolean {
  if (!signature) return false
  const key = `${clientSecret}&`
  const expected = createHmac('sha1', key).update(body).digest('base64')
  return expected === signature
}

export interface FitbitNotification {
  collectionType: string
  date: string
  ownerId: string
  subscriptionId?: string
}

/**
 * Parse and validate Fitbit notification payload.
 * Returns only entries that have the required fields.
 */
export function parseFitbitNotifications(body: unknown): FitbitNotification[] {
  if (!Array.isArray(body)) return []

  return body.filter((n): n is FitbitNotification =>
    typeof n === 'object' &&
    n !== null &&
    typeof (n as Record<string, unknown>).collectionType === 'string' &&
    typeof (n as Record<string, unknown>).date === 'string' &&
    typeof (n as Record<string, unknown>).ownerId === 'string',
  )
}
