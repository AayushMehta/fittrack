import { db } from '@/lib/db'
import { toISODate } from '@/lib/utils'

export async function getWeightTrend(userId: string, days = 30) {
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - (days - 1))
  from.setUTCHours(0, 0, 0, 0)

  const [logs, metrics] = await Promise.all([
    db.dailyLog.findMany({
      where: { userId, date: { gte: from } },
      orderBy: { date: 'asc' },
      select: { date: true, weight: true },
    }),
    db.computedMetric.findMany({
      where: { userId, date: { gte: from } },
      orderBy: { date: 'asc' },
      select: { date: true, emaWeight: true, rollingAvg7d: true },
    }),
  ])

  // Merge by date
  const metricMap = new Map(metrics.map((m) => [toISODate(m.date), m]))

  return logs.map((l) => {
    const dateStr = toISODate(l.date)
    const metric = metricMap.get(dateStr)
    return {
      date: dateStr,
      weight: l.weight,
      ema: metric?.emaWeight ?? null,
      rolling7d: metric?.rollingAvg7d ?? null,
    }
  })
}

export async function getBodyComposition(userId: string, days = 30) {
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - (days - 1))
  from.setUTCHours(0, 0, 0, 0)

  const metrics = await db.computedMetric.findMany({
    where: {
      userId,
      date: { gte: from },
      trueFatPct: { not: null },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      trueFatPct: true,
      estimatedFatMass: true,
      estimatedLeanMass: true,
      confidenceScore: true,
    },
  })

  return metrics.map((m) => ({
    date: toISODate(m.date),
    trueFatPct: m.trueFatPct,
    fatMass: m.estimatedFatMass,
    leanMass: m.estimatedLeanMass,
    confidence: m.confidenceScore,
  }))
}
