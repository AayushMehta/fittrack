import { z } from 'zod'
import { WORKOUT_TYPES } from '@/lib/validations/daily-log'
import type { DailyLogOutput } from '@/lib/validations/daily-log'
import type { DeviceAdapter } from './adapter'

const recordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  weight: z.number().positive(),
  steps: z.number().int().nonnegative().optional(),
  workedOut: z.boolean().optional().default(false),
  workoutType: z.enum(WORKOUT_TYPES).optional(),
  caloriesIntake: z.number().int().nonnegative().optional(),
  proteinIntake: z.number().nonnegative().optional(),
  carbIntake: z.number().nonnegative().optional(),
  sodiumIntake: z.number().int().nonnegative().optional(),
  bodyFatPct: z.number().min(1).max(70).optional(),
  skeletalMuscleMass: z.number().nonnegative().optional(),
  bodyWaterPct: z.number().min(1).max(99).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
})

export const appleHealthAdapter: DeviceAdapter = {
  name: 'apple-health',

  parse(payload: unknown): DailyLogOutput[] {
    if (!Array.isArray(payload)) return []

    const results: DailyLogOutput[] = []
    for (const record of payload) {
      const parsed = recordSchema.safeParse(record)
      if (parsed.success) {
        results.push(parsed.data)
      }
    }
    return results
  },
}
