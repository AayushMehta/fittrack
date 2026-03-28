import { db } from '@/lib/db'
import { toISODate } from '@/lib/utils'
import type { Alert } from '@/lib/algorithms/alerts'

export interface AIContext {
  dateRange: { from: string; to: string }
  goals: {
    targetWeight: number | null
    targetBodyFatPct: number | null
    dailyCalorieTarget: number | null
    dailyProteinTarget: number | null
    dailyStepsTarget: number | null
    weeklyWorkoutTarget: number | null
  } | null
  latest: {
    date: string
    weight: number
    ema: number | null
    trueFatPct: number | null
    leanMass: number | null
    confidenceScore: number | null
  } | null
  trend: {
    emaStart: number | null
    emaEnd: number | null
    emaDelta: number | null
    avgConfidence: number | null
    avgProteinScore: number | null
    avgTrainingScore: number | null
    avgActivityScore: number | null
  }
  adherence7d: {
    loggedDays: number
    proteinHitDays: number
    workoutDays: number
    stepsHitDays: number
    avgProtein: number | null
    avgSteps: number | null
  }
  activeAlerts: Alert[]
  weightHistory: Array<{ date: string; weight: number; ema: number | null }>
}

export async function buildAIContext(userId: string): Promise<AIContext> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(today.getUTCDate() - 29)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 6)

  const [goal, recentLogs, recentMetrics, latestMetric] = await Promise.all([
    db.userGoal.findUnique({ where: { userId } }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
    }),
    db.computedMetric.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
    }),
    db.computedMetric.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    }),
  ])

  // Latest snapshot
  const latestLog = recentLogs[recentLogs.length - 1] ?? null
  const latest = latestLog && latestMetric
    ? {
        date: toISODate(latestLog.date),
        weight: latestLog.weight,
        ema: latestMetric.emaWeight,
        trueFatPct: latestMetric.trueFatPct,
        leanMass: latestMetric.estimatedLeanMass,
        confidenceScore: latestMetric.confidenceScore,
      }
    : null

  // EMA trend over 30d
  const firstMetric = recentMetrics[0] ?? null
  const lastMetric = recentMetrics[recentMetrics.length - 1] ?? null
  const emaStart = firstMetric?.emaWeight ?? null
  const emaEnd = lastMetric?.emaWeight ?? null
  const emaDelta = emaStart != null && emaEnd != null ? +(emaEnd - emaStart).toFixed(2) : null
  const avg = <T>(arr: T[], key: keyof T) => {
    const vals = arr.map((m) => m[key] as number | null).filter((v): v is number => v != null)
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  }

  // 7-day adherence
  const logs7d = recentLogs.filter((l) => l.date >= sevenDaysAgo)
  const proteinTarget = goal?.dailyProteinTarget ?? null
  const stepsTarget = goal?.dailyStepsTarget ?? null
  const proteinValues = logs7d.map((l) => l.proteinIntake).filter((v): v is number => v != null)
  const stepsValues = logs7d.map((l) => l.steps).filter((v): v is number => v != null)

  const adherence7d = {
    loggedDays: logs7d.length,
    proteinHitDays: proteinTarget
      ? logs7d.filter((l) => l.proteinIntake != null && l.proteinIntake >= proteinTarget * 0.9).length
      : 0,
    workoutDays: logs7d.filter((l) => l.workedOut).length,
    stepsHitDays: stepsTarget
      ? logs7d.filter((l) => l.steps != null && l.steps >= stepsTarget).length
      : 0,
    avgProtein: proteinValues.length ? +(proteinValues.reduce((a, b) => a + b, 0) / proteinValues.length).toFixed(0) : null,
    avgSteps: stepsValues.length ? Math.round(stepsValues.reduce((a, b) => a + b, 0) / stepsValues.length) : null,
  }

  // Active alerts from latest metric
  const activeAlerts: Alert[] = latestMetric?.alerts
    ? (JSON.parse(latestMetric.alerts as string) as Alert[])
    : []

  // Weight history (last 30d, one point per day)
  const metricMap = new Map(recentMetrics.map((m) => [toISODate(m.date), m.emaWeight]))
  const weightHistory = recentLogs.map((l) => ({
    date: toISODate(l.date),
    weight: l.weight,
    ema: metricMap.get(toISODate(l.date)) ?? null,
  }))

  return {
    dateRange: {
      from: toISODate(thirtyDaysAgo),
      to: toISODate(today),
    },
    goals: goal
      ? {
          targetWeight: goal.targetWeight,
          targetBodyFatPct: goal.targetBodyFatPct,
          dailyCalorieTarget: goal.dailyCalorieTarget,
          dailyProteinTarget: goal.dailyProteinTarget,
          dailyStepsTarget: goal.dailyStepsTarget,
          weeklyWorkoutTarget: goal.weeklyWorkoutTarget,
        }
      : null,
    latest,
    trend: {
      emaStart,
      emaEnd,
      emaDelta,
      avgConfidence: avg(recentMetrics, 'confidenceScore'),
      avgProteinScore: avg(recentMetrics, 'proteinScore'),
      avgTrainingScore: avg(recentMetrics, 'trainingScore'),
      avgActivityScore: avg(recentMetrics, 'activityScore'),
    },
    adherence7d,
    activeAlerts,
    weightHistory,
  }
}
