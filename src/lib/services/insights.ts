import { db } from '@/lib/db'
import { toISODate } from '@/lib/utils'
import type { Alert } from '@/lib/algorithms/alerts'

export async function getInsights(userId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0)

  const [logs, goal, recentMetrics] = await Promise.all([
    db.dailyLog.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
    }),
    db.userGoal.findUnique({ where: { userId } }),
    db.computedMetric.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      take: 7,
    }),
  ])

  const totalDays = logs.length
  if (totalDays === 0) {
    return { adherence: null, streaks: null, alertHistory: [] }
  }

  // Adherence rates
  const withProtein = logs.filter(
    (l) => l.proteinIntake != null && goal?.dailyProteinTarget && l.proteinIntake >= goal.dailyProteinTarget * 0.8,
  ).length
  const withTraining = logs.filter((l) => l.workedOut).length
  const withSteps = logs.filter(
    (l) => l.steps != null && goal?.dailyStepsTarget && l.steps >= goal.dailyStepsTarget,
  ).length

  const adherence = {
    proteinPct: Math.round((withProtein / totalDays) * 100),
    trainingPct: Math.round((withTraining / totalDays) * 100),
    stepsPct: Math.round((withSteps / totalDays) * 100),
    loggedDays: totalDays,
  }

  // Current streak — consecutive days logged up to today
  const sortedDates = logs.map((l) => toISODate(l.date)).sort().reverse()
  let streak = 0
  const today = toISODate(new Date())
  let expected = today
  for (const d of sortedDates) {
    if (d === expected) {
      streak++
      const prev = new Date(expected + 'T00:00:00Z')
      prev.setUTCDate(prev.getUTCDate() - 1)
      expected = toISODate(prev)
    } else {
      break
    }
  }

  // Alert history from recent computed metrics
  const alertHistory = recentMetrics.flatMap((m) => {
    const alerts: Alert[] = m.alerts ? (JSON.parse(m.alerts as string) as Alert[]) : []
    return alerts.map((a) => ({ ...a, date: toISODate(m.date) }))
  })

  return {
    adherence,
    streaks: { currentStreak: streak },
    alertHistory,
  }
}
