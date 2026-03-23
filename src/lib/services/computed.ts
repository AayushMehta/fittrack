import { db } from '@/lib/db'
import { calcEMA } from '@/lib/algorithms/ema'
import { calcRollingAvg7d } from '@/lib/algorithms/rolling-average'
import { calcSubScore, calcConfidence } from '@/lib/algorithms/confidence'
import { calcTrueFatPct, calcFatMass, calcLeanMass } from '@/lib/algorithms/body-composition'
import { generateAlerts } from '@/lib/algorithms/alerts'
import { parseISODate } from '@/lib/utils'

/**
 * Recompute and upsert ComputedMetric for a given user+date.
 * Called after every daily log POST/PUT.
 */
export async function recomputeMetrics(userId: string, dateStr: string): Promise<void> {
  const date = parseISODate(dateStr)

  // Fetch the latest log for this date
  const log = await db.dailyLog.findFirst({
    where: { userId, date },
    orderBy: { createdAt: 'desc' },
  })
  if (!log) return

  // Get previous day's computed metric for EMA chain
  const prevDate = new Date(date)
  prevDate.setUTCDate(prevDate.getUTCDate() - 1)
  const prevMetric = await db.computedMetric.findUnique({
    where: { userId_date: { userId, date: prevDate } },
  })

  // Get last 7 days of logs for rolling average and scoring
  const sevenDaysAgo = new Date(date)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
  const recentLogs = await db.dailyLog.findMany({
    where: { userId, date: { gte: sevenDaysAgo, lte: date } },
    orderBy: { date: 'asc' },
  })

  // Get 14-day-ago EMA for alert generation
  const fourteenDaysAgo = new Date(date)
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14)
  const metric14dAgo = await db.computedMetric.findUnique({
    where: { userId_date: { userId, date: fourteenDaysAgo } },
  })

  // Get user goals for scoring
  const goal = await db.userGoal.findUnique({ where: { userId } })

  // --- Weight smoothing ---
  const emaWeight = calcEMA(log.weight, prevMetric?.emaWeight ?? null)
  const weights = recentLogs.map((l) => l.weight)
  const rollingAvg7d = calcRollingAvg7d(weights)

  // --- Body composition ---
  const trueFatPct = calcTrueFatPct(log.bodyFatPct, log.bodyWaterPct)
  const estimatedFatMass = calcFatMass(log.weight, trueFatPct)
  const estimatedLeanMass = calcLeanMass(log.weight, trueFatPct)

  // --- Confidence scoring ---
  const avgProtein =
    recentLogs.reduce((s, l) => s + (l.proteinIntake ?? 0), 0) / recentLogs.length
  const workoutsThisWeek = recentLogs.filter((l) => l.workedOut).length

  const proteinScore = calcSubScore(avgProtein, goal?.dailyProteinTarget ?? 0)
  const trainingScore = calcSubScore(workoutsThisWeek, goal?.weeklyWorkoutTarget ?? 3)
  const avgSteps = recentLogs.reduce((s, l) => s + (l.steps ?? 0), 0) / recentLogs.length
  const activityScore = calcSubScore(avgSteps, goal?.dailyStepsTarget ?? 8000)
  const confidenceScore = calcConfidence(proteinScore, trainingScore, activityScore)

  // --- Previous lean mass (7 days ago) for muscle loss alert ---
  const sevenDaysAgoMetric = await db.computedMetric.findUnique({
    where: { userId_date: { userId, date: sevenDaysAgo } },
  })

  // --- Alerts ---
  const alerts = generateAlerts({
    emaToday: emaWeight,
    ema14dAgo: metric14dAgo?.emaWeight ?? null,
    confidenceScore,
    proteinIntake: log.proteinIntake,
    dailyProteinGoal: goal?.dailyProteinTarget ?? null,
    trueFatPct,
    leanMassKg: estimatedLeanMass,
    prevLeanMassKg: sevenDaysAgoMetric?.estimatedLeanMass ?? null,
  })

  // --- Upsert ComputedMetric ---
  await db.computedMetric.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      emaWeight,
      rollingAvg7d,
      trueFatPct,
      estimatedFatMass,
      estimatedLeanMass,
      confidenceScore,
      proteinScore,
      trainingScore,
      activityScore,
      alerts: JSON.stringify(alerts),
    },
    update: {
      emaWeight,
      rollingAvg7d,
      trueFatPct,
      estimatedFatMass,
      estimatedLeanMass,
      confidenceScore,
      proteinScore,
      trainingScore,
      activityScore,
      alerts: JSON.stringify(alerts),
      computedAt: new Date(),
    },
  })
}
