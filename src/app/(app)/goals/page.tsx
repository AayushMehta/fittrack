import { auth } from '@/lib/auth'
import { getGoal } from '@/lib/services/goal'
import { db } from '@/lib/db'
import { toISODate } from '@/lib/utils'
import { GoalsClient } from './goals-client'

export default async function GoalsPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 6)

  const [goal, latestMetric, recentLogs] = await Promise.all([
    getGoal(userId),
    db.computedMetric.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
    }),
  ])

  const proteins = recentLogs.map((l) => l.proteinIntake).filter((v): v is number => v != null)
  const steps = recentLogs.map((l) => l.steps).filter((v): v is number => v != null)
  const workouts = recentLogs.filter((l) => l.workedOut).length

  const current = {
    emaWeight: latestMetric?.emaWeight ?? null,
    trueFatPct: latestMetric?.trueFatPct ?? null,
    avgProtein7d: proteins.length ? +(proteins.reduce((a, b) => a + b, 0) / proteins.length).toFixed(0) : null,
    avgSteps7d: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null,
    workoutsThisWeek: workouts,
    asOf: latestMetric ? toISODate(latestMetric.date) : null,
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set your fitness targets to unlock confidence scoring and alerts.
        </p>
      </div>
      <GoalsClient goal={goal} current={current} />
    </div>
  )
}
