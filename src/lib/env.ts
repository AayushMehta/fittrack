import { z } from 'zod'

/**
 * Server-side environment variables validated at startup.
 * If any required variable is missing or malformed, the app
 * will throw immediately with a descriptive error.
 */
const serverSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),

  // NextAuth
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
  AUTH_URL: z.string().url().optional(),

  // AWS S3 (progress photo uploads)
  AWS_REGION: z.string().min(1).default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET: z.string().default(''),
  AWS_S3_ENDPOINT: z.string().optional(),

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
