import { z } from 'zod'

/**
 * Server-side environment variables validated at startup.
 * If any required variable is missing or malformed, the app
 * will throw immediately with a descriptive error.
 */
const serverSchema = z.object({
  // Database (SQLite: "file:./dev.db" | PostgreSQL: full connection URL)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // NextAuth
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
  AUTH_URL: z.string().url().optional(),

  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

/**
 * Client-side environment variables (NEXT_PUBLIC_*).
 * Available in both server and browser contexts.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('FitTrack'),
})

const serverResult = serverSchema.safeParse(process.env)
const clientResult = clientSchema.safeParse(process.env)

if (!serverResult.success) {
  const formatted = serverResult.error.flatten().fieldErrors
  console.error('Invalid server environment variables:', formatted)
  throw new Error(`Missing or invalid environment variables:\n${JSON.stringify(formatted, null, 2)}`)
}

if (!clientResult.success) {
  const formatted = clientResult.error.flatten().fieldErrors
  console.error('Invalid client environment variables:', formatted)
  throw new Error(`Missing or invalid client environment variables:\n${JSON.stringify(formatted, null, 2)}`)
}

export const serverEnv = serverResult.data
export const clientEnv = clientResult.data

/** Combined env — convenience export for server-side code */
export const env = { ...serverResult.data, ...clientResult.data }
