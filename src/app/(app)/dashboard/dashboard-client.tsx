'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import type { getDashboardData } from '@/lib/services/dashboard'

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

function StatCard({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {value != null ? (
          <>
            {typeof value === 'number' ? value.toFixed(1) : value}
            {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
          </>
        ) : (
          <span className="text-muted-foreground text-lg">—</span>
        )}
      </p>
    </div>
  )
}

export function DashboardClient({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      {!data.todayLogged && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          You haven&apos;t logged today.{' '}
          <Link href="/log" className="font-medium underline">
            Log now →
          </Link>
        </div>
      )}

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg border px-4 py-3 text-sm ${
                alert.severity === 'critical'
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
                  : alert.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200'
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Current Weight" value={data.currentWeight} unit="kg" />
        <StatCard label="EMA Weight" value={data.emaWeight} unit="kg" />
        <StatCard label="True Body Fat" value={data.trueFatPct} unit="%" />
        <StatCard
          label="Confidence Score"
          value={data.confidenceScore != null ? Math.round(data.confidenceScore) : null}
          unit="/100"
        />
      </div>

      {data.chartData.length > 1 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Weight Trend (7 days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                formatter={(value) => [typeof value === 'number' ? `${value.toFixed(1)} kg` : value]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line type="monotone" dataKey="ema" stroke="#6366f1" strokeWidth={2} dot={false} name="EMA" />
              <Line
                type="monotone"
                dataKey="rolling7d"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
                name="7d avg"
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.chartData.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No data yet. Start by logging your first entry.
        </div>
      )}
    </div>
  )
}
