'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { getWeightTrend, getBodyComposition } from '@/lib/services/progress'

type WeightTrend = Awaited<ReturnType<typeof getWeightTrend>>
type BodyComp = Awaited<ReturnType<typeof getBodyComposition>>

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      {children}
    </div>
  )
}

export function ProgressClient({
  weightTrend,
  bodyComp,
}: {
  weightTrend: WeightTrend
  bodyComp: BodyComp
}) {
  const fmt = (d: string) => d.slice(5) // MM-DD

  return (
    <div className="space-y-6">
      <ChartCard title="Weight Trend (30 days)">
        {weightTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weightTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={40} unit="kg" />
              <Tooltip
                formatter={(v) => [typeof v === 'number' ? `${v.toFixed(2)} kg` : v]}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <Legend />
              <Line type="monotone" dataKey="weight" stroke="#94a3b8" strokeWidth={1} dot={{ r: 2 }} name="Raw" />
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
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet. Start logging!</p>
        )}
      </ChartCard>

      <ChartCard title="Body Composition (30 days)">
        {bodyComp.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={bodyComp}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <YAxis yAxisId="pct" domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={40} unit="%" />
              <YAxis yAxisId="kg" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={40} unit="kg" />
              <Tooltip labelFormatter={(l) => `Date: ${l}`} />
              <Legend />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="trueFatPct"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Fat %"
              />
              <Line
                yAxisId="kg"
                type="monotone"
                dataKey="leanMass"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="Lean Mass (kg)"
              />
              <Line
                yAxisId="kg"
                type="monotone"
                dataKey="fatMass"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                name="Fat Mass (kg)"
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Log BIA readings (body fat %, body water %) to see body composition data.
          </p>
        )}
      </ChartCard>
    </div>
  )
}
