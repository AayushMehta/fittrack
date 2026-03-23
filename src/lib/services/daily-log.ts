import { db } from '@/lib/db'
import type { DailyLogOutput as DailyLogInput } from '@/lib/validations/daily-log'
import { parseISODate } from '@/lib/utils'

export async function createLog(userId: string, input: DailyLogInput) {
  return db.dailyLog.create({
    data: {
      userId,
      date: parseISODate(input.date),
      weight: input.weight,
      steps: input.steps,
      workedOut: input.workedOut ?? false,
      workoutType: input.workoutType,
      caloriesIntake: input.caloriesIntake,
      proteinIntake: input.proteinIntake,
      carbIntake: input.carbIntake,
      sodiumIntake: input.sodiumIntake,
      bodyFatPct: input.bodyFatPct,
      skeletalMuscleMass: input.skeletalMuscleMass,
      bodyWaterPct: input.bodyWaterPct,
      sleepHours: input.sleepHours,
    },
  })
}

export async function getLogByDate(userId: string, date: string) {
  // Returns the latest entry for the date (correction pattern)
  return db.dailyLog.findFirst({
    where: { userId, date: parseISODate(date) },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLogs(
  userId: string,
  opts: { from?: string; to?: string; page?: number; pageSize?: number } = {},
) {
  const { from, to, page = 1, pageSize = 30 } = opts
  const where = {
    userId,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: parseISODate(from) } : {}),
            ...(to ? { lte: parseISODate(to) } : {}),
          },
        }
      : {}),
  }

  const [total, logs] = await Promise.all([
    db.dailyLog.count({ where }),
    db.dailyLog.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return { logs, total, page, pageSize }
}
