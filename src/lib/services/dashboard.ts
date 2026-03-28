import { db } from '@/lib/db'
import { parseISODate, toISODate } from '@/lib/utils'
import type { Alert } from '@/lib/algorithms/alerts'

export async function getDashboardData(userId: string, days = 30) {
  const today = toISODate(new Date())
  const todayDate = parseISODate(today)

  const from = new Date(todayDate)
  from.setUTCDate(from.getUTCDate() - (days - 1))

  const [todayLog, todayMetric, goal, recentMetrics, latestLog, recentLogs] = await Promise.all([
    db.dailyLog.findFirst({
      where: { userId, date: todayDate },
      orderBy: { createdAt: 'desc' },
    }),
    db.computedMetric.findUnique({ where: { userId_date: { userId, date: todayDate } } }),
    db.userGoal.findUnique({ where: { userId } }),
    db.computedMetric.findMany({
      where: { userId, date: { gte: from, lte: todayDate } },
      orderBy: { date: 'asc' },
    }),
    db.dailyLog.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: from, lte: todayDate } },
      select: { date: true, weight: true },
      orderBy: { date: 'asc' },
    }),
  ])

  const currentWeight = latestLog?.weight ?? null
  const emaWeight = todayMetric?.emaWeight ?? null
  const alerts: Alert[] = todayMetric?.alerts
    ? (JSON.parse(todayMetric.alerts as string) as Alert[])
    : []

  // Map raw weight by ISO date for O(1) lookup when building chartData
  const rawWeightMap = new Map(recentLogs.map((l) => [toISODate(l.date), l.weight]))

  const chartData = recentMetrics.map((m) => ({
    date: toISODate(m.date),
    ema: m.emaWeight,
    rolling7d: m.rollingAvg7d,
    rawWeight: rawWeightMap.get(toISODate(m.date)) ?? null,
  }))

  return {
    currentWeight,
    emaWeight,
    confidenceScore: todayMetric?.confidenceScore ?? null,
    trueFatPct: todayMetric?.trueFatPct ?? null,
    leanMass: todayMetric?.estimatedLeanMass ?? null,
    proteinScore: todayMetric?.proteinScore ?? null,
    trainingScore: todayMetric?.trainingScore ?? null,
    activityScore: todayMetric?.activityScore ?? null,
    alerts,
    chartData,
    todayLogged: !!todayLog,
    today: todayLog
      ? {
          steps: todayLog.steps,
          caloriesIntake: todayLog.caloriesIntake,
          proteinIntake: todayLog.proteinIntake,
          workedOut: todayLog.workedOut,
        }
      : null,
    goal: goal
      ? {
          targetWeight: goal.targetWeight,
          targetBodyFatPct: goal.targetBodyFatPct,
          dailyProteinTarget: goal.dailyProteinTarget,
          dailyCalorieTarget: goal.dailyCalorieTarget,
          dailyStepsTarget: goal.dailyStepsTarget,
          weeklyWorkoutTarget: goal.weeklyWorkoutTarget,
        }
      : null,
  }
}
