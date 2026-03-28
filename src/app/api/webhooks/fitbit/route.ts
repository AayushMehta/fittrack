import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env'
import { verifyFitbitSignature, parseFitbitNotifications } from '@/lib/devices/fitbit'

/**
 * GET /api/webhooks/fitbit
 *
 * Fitbit subscription verification challenge.
 * Fitbit sends ?verify=CODE — respond 204 if it matches our stored code, 404 otherwise.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const verify = searchParams.get('verify')

  if (verify && verify === serverEnv.FITBIT_SUBSCRIBER_VERIFICATION_CODE) {
    return new NextResponse(null, { status: 204 })
  }

  return new NextResponse(null, { status: 404 })
}

/**
 * POST /api/webhooks/fitbit
 *
 * Fitbit pushes notification payloads here whenever subscribed data changes.
 * We verify the HMAC-SHA1 signature, parse the notifications, and acknowledge.
 *
 * Response: 204 No Content on success
 */
export async function POST(request: Request) {
  const body = await request.text()

  const signature = request.headers.get('X-Fitbit-Signature') ?? ''
  const clientSecret = serverEnv.FITBIT_CLIENT_SECRET ?? ''

  if (!verifyFitbitSignature(body, signature, clientSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Parse notifications — we acknowledge receipt; actual data sync happens async
  parseFitbitNotifications(parsed)

  return new NextResponse(null, { status: 204 })
}
