/**
 * Typed fetch wrapper for client-side API calls.
 * - Auto-sets Content-Type: application/json
 * - Parses response JSON
 * - Throws ApiError on non-2xx responses
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function api<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const json = await res.json().catch(() => ({})) as { error?: string; details?: unknown }

  if (!res.ok) {
    throw new ApiError(res.status, json.error ?? `HTTP ${res.status}`, json.details)
  }

  return json as T
}
