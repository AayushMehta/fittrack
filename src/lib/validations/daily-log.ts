import { z } from 'zod'

export const WORKOUT_TYPES = ['STRENGTH', 'CARDIO', 'HIIT', 'YOGA', 'SPORTS', 'OTHER'] as const

export const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  weight: z.number().positive('Weight must be positive'),
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

export type DailyLogInput = z.input<typeof dailyLogSchema>
export type DailyLogOutput = z.infer<typeof dailyLogSchema>
