import { z } from 'zod'

export const goalSchema = z.object({
  targetWeight: z.number().positive().optional(),
  targetBodyFatPct: z.number().min(1).max(70).optional(),
  dailyCalorieTarget: z.number().int().positive().optional(),
  dailyProteinTarget: z.number().positive().optional(),
  dailyStepsTarget: z.number().int().positive().optional(),
  weeklyWorkoutTarget: z.number().int().min(0).max(14).optional(),
})

export type GoalInput = z.infer<typeof goalSchema>
