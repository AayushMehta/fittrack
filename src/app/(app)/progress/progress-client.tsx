'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { cn } from '@/lib/utils'
import type { getWeightTrend, getBodyComposition } from '@/lib/services/progress'

type WeightTrend = Awaited<ReturnType<typeof getWeightTrend>>
type BodyComp = Awaited<ReturnType<typeof getBodyComposition>>

const DATE_RANGES = [
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: 'All', days: 365 },
] as const

function DateRangeSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (days: number) => void
}) {
  return (
    <div className="flex gap-1">
      {DATE_RANGES.map(({ label, days }) => (
        <button
          key={days}
          onClick={() => onChange(days)}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            value === days
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function ChartCard({
  title,
  controls,
  children,
}: {
  title: string
  controls?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {controls}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

async function fetchWeightTrend(days: number): Promise<WeightTrend> {
  const res = await fetch(`/api/progress/weight?days=${days}`)
  if (!res.ok) throw new Error('Failed to fetch weight trend')
  const json = await res.json()
  return json.data
}

async function fetchBodyComp(days: number): Promise<BodyComp> {
  const res = await fetch(`/api/progress/body-composition?days=${days}`)
  if (!res.ok) throw new Error('Failed to fetch body composition')
  const json = await res.json()
  return json.data
}

export function ProgressClient() {
  const [days, setDays] = useState(30)

  const fmt = (d: string) => d.slice(5)

  const { data: weightTrend = [], isFetching: weightLoading } = useQuery({
    queryKey: ['progress', 'weight', days],
    queryFn: () => fetchWeightTrend(days),
    staleTime: 60_000,
  })

  const { data: bodyComp = [], isFetching: compLoading } = useQuery({
    queryKey: ['progress', 'body-composition', days],
    queryFn: () => fetchBodyComp(days),
    staleTime: 60_000,
  })

  const loading = weightLoading || compLoading

  return (
    <div className="space-y-6">
      <ChartCard
        title="Weight Trend"
        controls={
          <div className="flex items-center gap-3">
            {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
            <DateRangeSelector value={days} onChange={setDays} />
          </div>
        }
      >
        {weightTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weightTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={fmt}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                width={40}
                unit=" kg"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v) => [typeof v === 'number' ? `${v.toFixed(2)} kg` : v]}
                labelFormatter={(l) => l}
              />
              <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#94a3b8"
                strokeWidth={1}
                dot={{ r: 1.5 }}
                name="Raw"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="ema"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="EMA"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="rolling7d"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
                name="7d avg"
                strokeDasharray="4 2"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No data yet. Start logging your weight." />
        )}
      </ChartCard>

      <ChartCard title="Body Composition">
        {bodyComp.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={bodyComp} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={fmt}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="pct"
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                width={36}
                unit="%"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="kg"
                orientation="right"
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                width={36}
                unit=" kg"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelFormatter={(l) => l}
              />
              <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="trueFatPct"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Fat %"
                connectNulls
              />
              <Line
                yAxisId="kg"
                type="monotone"
                dataKey="leanMass"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="Lean (kg)"
                connectNulls
              />
              <Line
                yAxisId="kg"
                type="monotone"
                dataKey="fatMass"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                name="Fat (kg)"
                strokeDasharray="4 2"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Log BIA readings (body fat %, body water %) to see body composition data." />
        )}
      </ChartCard>
    </div>
  )
}
