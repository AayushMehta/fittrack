import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

vi.mock('@/lib/env', () => ({
  serverEnv: {
    FITBIT_CLIENT_SECRET: 'test-fitbit-secret',
    FITBIT_SUBSCRIBER_VERIFICATION_CODE: 'test-verify-code-123',
  },
  clientEnv: {},
  env: {
    FITBIT_CLIENT_SECRET: 'test-fitbit-secret',
    FITBIT_SUBSCRIBER_VERIFICATION_CODE: 'test-verify-code-123',
  },
}))

function makeSignature(body: string, secret: string): string {
  return createHmac('sha1', `${secret}&`).update(body).digest('base64')
}

function makeRequest(method: string, url: string, body?: string, headers?: Record<string, string>): Request {
  return new Request(url, {
    method,
    body,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

// Import route handlers after mock is set up
const { GET, POST } = await import('@/app/api/webhooks/fitbit/route')

describe('GET /api/webhooks/fitbit', () => {
  it('returns 204 when verify code matches', async () => {
    const req = makeRequest('GET', 'http://localhost/api/webhooks/fitbit?verify=test-verify-code-123')
    const res = await GET(req)
    expect(res.status).toBe(204)
  })

  it('returns 404 when verify code does not match', async () => {
    const req = makeRequest('GET', 'http://localhost/api/webhooks/fitbit?verify=wrong-code')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when verify param is missing', async () => {
    const req = makeRequest('GET', 'http://localhost/api/webhooks/fitbit')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/webhooks/fitbit', () => {
  const secret = 'test-fitbit-secret'
  const notifications = [
    { collectionType: 'activities', date: '2025-03-01', ownerId: 'user123' },
  ]

  it('returns 204 for a valid signed payload', async () => {
    const body = JSON.stringify(notifications)
    const sig = makeSignature(body, secret)
    const req = makeRequest('POST', 'http://localhost/api/webhooks/fitbit', body, {
      'X-Fitbit-Signature': sig,
    })
    const res = await POST(req)
    expect(res.status).toBe(204)
  })

  it('returns 401 for an invalid signature', async () => {
    const body = JSON.stringify(notifications)
    const req = makeRequest('POST', 'http://localhost/api/webhooks/fitbit', body, {
      'X-Fitbit-Signature': 'bad-signature',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when signature header is missing', async () => {
    const body = JSON.stringify(notifications)
    const req = makeRequest('POST', 'http://localhost/api/webhooks/fitbit', body)
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid JSON body', async () => {
    const body = 'not-json'
    const sig = makeSignature(body, secret)
    const req = makeRequest('POST', 'http://localhost/api/webhooks/fitbit', body, {
      'X-Fitbit-Signature': sig,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
