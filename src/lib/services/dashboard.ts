import { db } from '@/lib/db'
import { parseISODate, toISODate } from '@/lib/utils'
import type { Alert } from '@/lib/algorithms/alerts'

export async function getDashboardData(userId: string) {
  const today = toISODate(new Date())
  const todayDate = parseISODate(today)

  // Last 7 days for the mini chart
  const sevenDaysAgo = new Date(todayDate)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)

  const [todayLog, todayMetric, goal, recentMetrics, latestLog] = await Promise.all([
    db.dailyLog.findFirst({
      where: { userId, date: todayDate },
      orderBy: { createdAt: 'desc' },
    }),
    db.computedMetric.findUnique({ where: { userId_date: { userId, date: todayDate } } }),
    db.userGoal.findUnique({ where: { userId } }),
    db.computedMetric.findMany({
      where: { userId, date: { gte: sevenDaysAgo, lte: todayDate } },
      orderBy: { date: 'asc' },
    }),
    db.dailyLog.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
  ])

  const currentWeight = latestLog?.weight ?? null
  const emaWeight = todayMetric?.emaWeight ?? null
  const alerts: Alert[] = todayMetric?.alerts
    ? (JSON.parse(todayMetric.alerts as string) as Alert[])
    : []

  const chartData = recentMetrics.map((m) => ({
    date: toISODate(m.date),
    ema: m.emaWeight,
    rolling7d: m.rollingAvg7d,
  }))

  return {
    currentWeight,
    emaWeight,
    confidenceScore: todayMetric?.confidenceScore ?? null,
    trueFatPct: todayMetric?.trueFatPct ?? null,
    alerts,
    chartData,
    todayLogged: !!todayLog,
    goal: goal
      ? {
          targetWeight: goal.targetWeight,
          dailyProteinTarget: goal.dailyProteinTarget,
          dailyCalorieTarget: goal.dailyCalorieTarget,
        }
      : null,
  }
}
