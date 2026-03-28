'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { getDashboardData } from '@/lib/services/dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

// ─── Date range selector ──────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
]

function DateRangeSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (d: number) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg border bg-muted p-0.5">
      {DATE_RANGES.map(({ label, days }) => (
        <button
          key={days}
          onClick={() => onChange(days)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            value === days
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
  delta,
  accentColor,
  highlight = false,
}: {
  label: string
  value: string | null
  unit?: string
  delta?: number | null
  accentColor: string
  highlight?: boolean
}) {
  const deltaIcon =
    delta == null ? null : delta > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : delta < 0 ? (
      <TrendingDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    )

  const deltaColor =
    delta == null
      ? ''
      : delta > 0
        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400'
        : delta < 0
          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400'
          : 'text-muted-foreground bg-secondary'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm',
        highlight && 'ring-2 ring-indigo-500/30',
      )}
      style={{ borderBottom: `3px solid ${accentColor}` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
        {value ?? '—'}
        {value && unit && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
      {delta != null && (
        <span
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            deltaColor,
          )}
        >
          {deltaIcon}
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}
          {unit ? ` ${unit}` : ''}
        </span>
      )}
    </div>
  )
}

// ─── Line toggles ─────────────────────────────────────────────────────────────

const LINE_CONFIG = [
  { key: 'ema' as const, label: 'EMA', color: '#6366f1' },
  { key: 'rawWeight' as const, label: 'Raw', color: '#94a3b8' },
  { key: 'rolling7d' as const, label: '7d avg', color: '#22c55e' },
]

type VisibleLines = Record<'ema' | 'rawWeight' | 'rolling7d', boolean>

function LineToggles({
  visibleLines,
  onToggle,
}: {
  visibleLines: VisibleLines
  onToggle: (key: keyof VisibleLines) => void
}) {
  return (
    <div className="flex gap-1.5">
      {LINE_CONFIG.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
            visibleLines[key]
              ? 'border-transparent text-foreground'
              : 'border-border text-muted-foreground opacity-50',
          )}
          style={
            visibleLines[key]
              ? { backgroundColor: `${color}20`, borderColor: `${color}60` }
              : undefined
          }
        >
          <span
            className="inline-block h-2 w-4 rounded-full"
            style={{ backgroundColor: color, opacity: visibleLines[key] ? 1 : 0.3 }}
          />
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Weight chart ─────────────────────────────────────────────────────────────

function WeightChart({
  chartData,
  visibleLines,
  targetWeight,
}: {
  chartData: DashboardData['chartData']
  visibleLines: VisibleLines
  targetWeight: number | null | undefined
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          unit=" kg"
          width={48}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card)',
          }}
          formatter={(value: unknown, name: unknown) =>
            typeof value === 'number'
              ? [`${value.toFixed(2)} kg`, name as string]
              : [String(value), name as string]
          }
        />
        {targetWeight != null && (
          <ReferenceLine
            y={targetWeight}
            stroke="#6366f1"
            strokeDasharray="4 2"
            strokeOpacity={0.6}
            label={{ value: 'Goal', fontSize: 10, fill: '#6366f1' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="ema"
          name="EMA"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          connectNulls
          hide={!visibleLines.ema}
        />
        <Line
          type="linear"
          dataKey="rawWeight"
          name="Raw"
          stroke="#94a3b8"
          strokeWidth={1}
          dot={{ r: 2, fill: '#94a3b8' }}
          connectNulls={false}
          hide={!visibleLines.rawWeight}
        />
        <Line
          type="monotone"
          dataKey="rolling7d"
          name="7d avg"
          stroke="#22c55e"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          connectNulls
          hide={!visibleLines.rolling7d}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Ring progress ────────────────────────────────────────────────────────────

const RING_R = 28
const RING_CIRC = 2 * Math.PI * RING_R

function RingProgress({
  value,
  target,
  label,
  unit,
  color,
}: {
  value: number | null | undefined
  target: number | null | undefined
  label: string
  unit: string
  color: string
}) {
  const hasTarget = target != null && target > 0
  const hasValue = value != null
  const pct = hasTarget && hasValue ? Math.min(value! / target!, 1) : 0
  const offset = RING_CIRC * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
          <circle
            cx="36"
            cy="36"
            r={RING_R}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-secondary"
          />
          <circle
            cx="36"
            cy="36"
            r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.45s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
          {hasValue ? `${Math.round(pct * 100)}%` : '—'}
        </span>
      </div>
      <span className="text-xs font-semibold tabular-nums">
        {hasValue ? value!.toLocaleString() : '—'}
        <span className="text-[10px] font-normal text-muted-foreground"> {unit}</span>
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {!hasTarget && (
        <span className="text-[9px] text-muted-foreground/60">no goal</span>
      )}
    </div>
  )
}

function WorkoutBadge({ workedOut }: { workedOut: boolean | undefined }) {
  if (workedOut == null) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        workedOut
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-secondary text-muted-foreground',
      )}
    >
      {workedOut ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {workedOut ? 'Worked out' : 'Rest day'}
    </span>
  )
}

// ─── Confidence breakdown ─────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number | null }) {
  const val = score ?? 0
  const color =
    val >= 70 ? 'bg-emerald-500' : val >= 40 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${val}%` }}
      />
    </div>
  )
}

function ConfidenceBreakdown({
  overall,
  proteinScore,
  trainingScore,
  activityScore,
}: {
  overall: number | null | undefined
  proteinScore: number | null | undefined
  trainingScore: number | null | undefined
  activityScore: number | null | undefined
}) {
  const hasScores =
    proteinScore != null || trainingScore != null || activityScore != null

  if (!hasScores) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
        <p className="text-3xl font-bold tabular-nums">{overall ?? '—'}</p>
        <p className="text-xs text-muted-foreground">
          Set goals to unlock score breakdown
        </p>
      </div>
    )
  }

  const segments = [
    { label: 'Protein', score: proteinScore ?? null },
    { label: 'Training', score: trainingScore ?? null },
    { label: 'Activity', score: activityScore ?? null },
  ]

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center justify-center border-r pr-4">
        <p className="text-3xl font-bold tabular-nums">
          {overall != null ? Math.round(overall) : '—'}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">/ 100</p>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {segments.map(({ label, score }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <div className="flex-1">
              <ScoreBar score={score} />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums">
              {score != null ? Math.round(score) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Alert card ───────────────────────────────────────────────────────────────

type AlertSeverity = 'info' | 'warning' | 'critical'
type AlertItem = { type: string; message: string; severity: AlertSeverity }

const ALERT_STYLES: Record<AlertSeverity, string> = {
  critical:
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const Icon =
    alert.severity === 'critical'
      ? XCircle
      : alert.severity === 'warning'
        ? AlertTriangle
        : Info
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs',
        ALERT_STYLES[alert.severity],
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{alert.message}</span>
    </div>
  )
}

// ─── Log nudge ────────────────────────────────────────────────────────────────

function LogNudge() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <span>No entry today yet — keep your streak going!</span>
      <Link
        href="/log"
        className="ml-4 shrink-0 rounded-md bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100"
      >
        Log now →
      </Link>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardClient({ initialData }: { initialData?: DashboardData }) {
  const [days, setDays] = useState(30)
  const [visibleLines, setVisibleLines] = useState<VisibleLines>({
    ema: true,
    rawWeight: true,
    rolling7d: true,
  })

  const { data, isFetching } = useQuery<DashboardData>({
    queryKey: ['dashboard', days],
    queryFn: () =>
      fetch(`/api/dashboard?days=${days}`)
        .then((r) => r.json())
        .then((j: { data: DashboardData }) => j.data),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    // Use SSR data for the default 30-day view — no loading flash on first render
    initialData: days === 30 ? initialData : undefined,
  })

  function toggleLine(key: keyof VisibleLines) {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // EMA delta over the selected range
  const emaRangeDelta = (() => {
    if (!data?.chartData || data.chartData.length < 2) return null
    const first = data.chartData.find((d) => d.ema != null)?.ema ?? null
    const last = [...data.chartData].reverse().find((d) => d.ema != null)?.ema ?? null
    if (first == null || last == null) return null
    return parseFloat((last - first).toFixed(2))
  })()

  // Raw weight delta over range
  const rawRangeDelta = (() => {
    if (!data?.chartData || data.chartData.length < 2) return null
    const first = data.chartData.find((d) => d.rawWeight != null)?.rawWeight ?? null
    const last =
      [...data.chartData].reverse().find((d) => d.rawWeight != null)?.rawWeight ?? null
    if (first == null || last == null) return null
    return parseFloat((last - first).toFixed(2))
  })()

  const isEmpty = data && data.chartData.length === 0 && !data.todayLogged

  return (
    <div className="space-y-5">
      {/* Row 1 — Title + Date range */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {isFetching && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
          <DateRangeSelector value={days} onChange={setDays} />
        </div>
      </div>

      {/* Row 2 — Log nudge */}
      {data && !data.todayLogged && <LogNudge />}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No entries yet.</p>
          <Link
            href="/log"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Log your first entry →
          </Link>
        </div>
      )}

      {/* Row 3 — KPI cards */}
      {!data ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard
            label="EMA Weight"
            value={data.emaWeight != null ? data.emaWeight.toFixed(1) : null}
            unit="kg"
            delta={emaRangeDelta}
            accentColor="#6366f1"
            highlight
          />
          <KpiCard
            label="Raw Weight"
            value={data.currentWeight != null ? data.currentWeight.toFixed(1) : null}
            unit="kg"
            delta={rawRangeDelta}
            accentColor="#94a3b8"
          />
          <KpiCard
            label="True Fat %"
            value={data.trueFatPct != null ? data.trueFatPct.toFixed(1) : null}
            unit="%"
            accentColor="#f97316"
          />
          <KpiCard
            label="Lean Mass"
            value={data.leanMass != null ? data.leanMass.toFixed(1) : null}
            unit="kg"
            accentColor="#22c55e"
          />
          <KpiCard
            label="Confidence"
            value={
              data.confidenceScore != null
                ? `${Math.round(data.confidenceScore)}/100`
                : null
            }
            accentColor="#a855f7"
          />
        </div>
      )}

      {/* Row 4 — Weight chart */}
      {data && data.chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Weight Trend — {days}d
            </h2>
            <LineToggles visibleLines={visibleLines} onToggle={toggleLine} />
          </div>
          <WeightChart
            chartData={data.chartData}
            visibleLines={visibleLines}
            targetWeight={data.goal?.targetWeight}
          />
        </div>
      )}

      {/* Row 5 — Today + Confidence (2-col) */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Today's adherence */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Today
              </h2>
              <WorkoutBadge workedOut={data.today?.workedOut} />
            </div>
            {data.today || data.goal ? (
              <div className="grid grid-cols-3 gap-4 place-items-center pt-1">
                <RingProgress
                  value={data.today?.caloriesIntake}
                  target={data.goal?.dailyCalorieTarget}
                  label="Calories"
                  unit="kcal"
                  color="#6366f1"
                />
                <RingProgress
                  value={data.today?.proteinIntake}
                  target={data.goal?.dailyProteinTarget}
                  label="Protein"
                  unit="g"
                  color="#f97316"
                />
                <RingProgress
                  value={data.today?.steps}
                  target={data.goal?.dailyStepsTarget}
                  label="Steps"
                  unit="steps"
                  color="#22c55e"
                />
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Log today or{' '}
                <Link href="/goals" className="underline">
                  set goals
                </Link>{' '}
                to see adherence.
              </p>
            )}
          </div>

          {/* Confidence breakdown */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confidence Score
            </h2>
            <ConfidenceBreakdown
              overall={data.confidenceScore}
              proteinScore={data.proteinScore}
              trainingScore={data.trainingScore}
              activityScore={data.activityScore}
            />
          </div>
        </div>
      )}

      {/* Row 6 — Alerts */}
      {data && data.alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert as AlertItem} />
          ))}
        </div>
      )}
    </div>
  )
}
