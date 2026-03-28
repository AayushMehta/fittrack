import { db } from '@/lib/db'
import type { WeeklyInput } from '@/lib/validations/weekly'
import { parseISODate } from '@/lib/utils'

export async function upsertWeeklyMetric(userId: string, data: WeeklyInput) {
  const weekStartDate = parseISODate(data.weekStartDate)
  return db.weeklyMetric.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate } },
    create: {
      userId,
      weekStartDate,
      waistCm: data.waistCm,
      benchPressPeak: data.benchPressPeak,
      squatPeak: data.squatPeak,
      deadliftPeak: data.deadliftPeak,
      otherStrengthNotes: data.otherStrengthNotes,
    },
    update: {
      waistCm: data.waistCm,
      benchPressPeak: data.benchPressPeak,
      squatPeak: data.squatPeak,
      deadliftPeak: data.deadliftPeak,
      otherStrengthNotes: data.otherStrengthNotes,
    },
  })
}

export async function listWeeklyMetrics(userId: string, opts: { limit?: number } = {}) {
  const { limit = 12 } = opts
  return db.weeklyMetric.findMany({
    where: { userId },
    orderBy: { weekStartDate: 'desc' },
    take: limit,
  })
}

export async function getWeeklyMetric(userId: string, weekStartDate: string) {
  return db.weeklyMetric.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: parseISODate(weekStartDate) } },
  })
}
