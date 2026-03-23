'use client'

import type { getInsights } from '@/lib/services/insights'

type InsightsData = Awaited<ReturnType<typeof getInsights>>

function AdherenceBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function InsightsClient({ data }: { data: InsightsData }) {
  if (!data.adherence) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        No data yet. Start logging to see insights.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium">30-Day Adherence</h2>
        <AdherenceBar label="Protein goal" pct={data.adherence.proteinPct} />
        <AdherenceBar label="Training" pct={data.adherence.trainingPct} />
        <AdherenceBar label="Steps goal" pct={data.adherence.stepsPct} />
        <p className="text-xs text-muted-foreground">Based on {data.adherence.loggedDays} logged days</p>
      </div>

      {data.streaks && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium mb-2">Current Streak</h2>
          <p className="text-3xl font-bold">
            {data.streaks.currentStreak}
            <span className="ml-2 text-base font-normal text-muted-foreground">days</span>
          </p>
        </div>
      )}

      {data.alertHistory.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-medium">Recent Alerts</h2>
          {data.alertHistory.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2 text-sm ${
                alert.severity === 'critical'
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
                  : alert.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200'
              }`}
            >
              <span className="font-medium">{alert.date}</span> — {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
