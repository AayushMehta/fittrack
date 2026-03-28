import { z } from 'zod'

export const weeklySchema = z.object({
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  waistCm: z.number().positive().optional(),
  benchPressPeak: z.number().positive().optional(),
  squatPeak: z.number().positive().optional(),
  deadliftPeak: z.number().positive().optional(),
  otherStrengthNotes: z.string().max(500).optional(),
})

export type WeeklyInput = z.infer<typeof weeklySchema>
