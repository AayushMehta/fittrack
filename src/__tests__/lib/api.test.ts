import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, ApiError } from '@/lib/api'

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError(404, 'Not found')
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
  })

  it('carries optional details', () => {
    const details = { field: ['required'] }
    const err = new ApiError(400, 'Bad request', details)
    expect(err.details).toEqual(details)
  })
})

describe('api()', () => {
  it('sets Content-Type: application/json by default', async () => {
    const fetch = mockFetch(200, { data: 'ok' })
    vi.stubGlobal('fetch', fetch)
    await api('/test')
    expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }))
  })

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { data: { id: 1 } }))
    const result = await api<{ data: { id: number } }>('/test')
    expect(result).toEqual({ data: { id: 1 } })
  })

  it('throws ApiError on non-2xx response', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { error: 'Not found' }))
    await expect(api('/test')).rejects.toBeInstanceOf(ApiError)
  })

  it('uses error message from response body', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { error: 'Invalid input' }))
    await expect(api('/test')).rejects.toMatchObject({ message: 'Invalid input', status: 400 })
  })

  it('falls back to "HTTP {status}" when body has no error field', async () => {
    vi.stubGlobal('fetch', mockFetch(500, {}))
    await expect(api('/test')).rejects.toMatchObject({ message: 'HTTP 500' })
  })

  it('forwards options (method, body) to fetch', async () => {
    const fetch = mockFetch(201, { data: { id: 2 } })
    vi.stubGlobal('fetch', fetch)
    await api('/test', { method: 'POST', body: JSON.stringify({ name: 'x' }) })
    expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'POST' }))
  })

  it('attaches details from response body to ApiError', async () => {
    const details = { field: ['too short'] }
    vi.stubGlobal('fetch', mockFetch(422, { error: 'Validation failed', details }))
    try {
      await api('/test')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).details).toEqual(details)
    }
  })
})
