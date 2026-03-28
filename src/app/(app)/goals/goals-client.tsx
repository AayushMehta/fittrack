'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { goalSchema, type GoalInput } from '@/lib/validations/goal'
import type { UserGoal } from '@prisma/client'

interface Current {
  emaWeight: number | null
  trueFatPct: number | null
  avgProtein7d: number | null
  avgSteps7d: number | null
  workoutsThisWeek: number
  asOf: string | null
}

function Field({
  label,
  id,
  unit,
  error,
  children,
}: {
  label: string
  id: string
  unit?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {unit && <span className="ml-1 text-xs text-muted-foreground">({unit})</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function GapRow({
  label,
  current,
  target,
  unit,
  lowerIsBetter,
}: {
  label: string
  current: number | null
  target: number | null | undefined
  unit: string
  lowerIsBetter?: boolean
}) {
  const gap = current != null && target != null ? +(current - target) : null
  const isGood = gap == null ? null : lowerIsBetter ? gap <= 0 : gap >= 0
  const Icon = gap == null ? null : gap === 0 ? Minus : gap > 0 ? TrendingUp : TrendingDown

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm tabular-nums">
          {current != null ? `${current.toLocaleString()} ${unit}` : <span className="text-muted-foreground/50">—</span>}
        </span>
        <span className="text-muted-foreground/40">→</span>
        <span className={cn('text-sm font-medium tabular-nums', !target && 'text-muted-foreground/40')}>
          {target != null ? `${target.toLocaleString()} ${unit}` : 'not set'}
        </span>
        {Icon && gap != null && (
          <span className={cn('flex items-center gap-0.5 text-xs', isGood ? 'text-emerald-500' : 'text-rose-500')}>
            <Icon className="h-3 w-3" />
            {Math.abs(gap).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function GoalsClient({ goal, current }: { goal: UserGoal | null; current: Current }) {
  const router = useRouter()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      targetWeight: goal?.targetWeight ?? undefined,
      targetBodyFatPct: goal?.targetBodyFatPct ?? undefined,
      dailyCalorieTarget: goal?.dailyCalorieTarget ?? undefined,
      dailyProteinTarget: goal?.dailyProteinTarget ?? undefined,
      dailyStepsTarget: goal?.dailyStepsTarget ?? undefined,
      weeklyWorkoutTarget: goal?.weeklyWorkoutTarget ?? undefined,
    },
  })

  // Live-watch form values for preview panel
  const watched = useWatch({ control })

  async function onSubmit(data: GoalInput) {
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Goals saved!')
      router.refresh()
    } else {
      toast.error('Failed to save goals')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Set Targets</h2>

        <Field label="Target Weight" id="targetWeight" unit="kg" error={errors.targetWeight?.message}>
          <input
            id="targetWeight"
            type="number"
            step="0.1"
            className={inputClass}
            placeholder="e.g. 70"
            {...register('targetWeight', { valueAsNumber: true })}
          />
        </Field>

        <Field label="Target Body Fat" id="targetBodyFatPct" unit="%" error={errors.targetBodyFatPct?.message}>
          <input
            id="targetBodyFatPct"
            type="number"
            step="0.1"
            className={inputClass}
            placeholder="e.g. 15"
            {...register('targetBodyFatPct', { valueAsNumber: true })}
          />
        </Field>

        <Field label="Daily Calorie Target" id="dailyCalorieTarget" unit="kcal" error={errors.dailyCalorieTarget?.message}>
          <input
            id="dailyCalorieTarget"
            type="number"
            className={inputClass}
            placeholder="e.g. 2000"
            {...register('dailyCalorieTarget', { valueAsNumber: true })}
          />
        </Field>

        <Field label="Daily Protein Target" id="dailyProteinTarget" unit="g" error={errors.dailyProteinTarget?.message}>
          <input
            id="dailyProteinTarget"
            type="number"
            step="0.1"
            className={inputClass}
            placeholder="e.g. 160"
            {...register('dailyProteinTarget', { valueAsNumber: true })}
          />
        </Field>

        <Field label="Daily Steps Target" id="dailyStepsTarget" unit="steps" error={errors.dailyStepsTarget?.message}>
          <input
            id="dailyStepsTarget"
            type="number"
            className={inputClass}
            placeholder="e.g. 8000"
            {...register('dailyStepsTarget', { valueAsNumber: true })}
          />
        </Field>

        <Field label="Weekly Workout Target" id="weeklyWorkoutTarget" unit="days/week" error={errors.weeklyWorkoutTarget?.message}>
          <input
            id="weeklyWorkoutTarget"
            type="number"
            min="0"
            max="14"
            className={inputClass}
            placeholder="e.g. 4"
            {...register('weeklyWorkoutTarget', { valueAsNumber: true })}
          />
        </Field>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save Goals'}
        </button>
      </form>

      {/* Preview panel */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Current vs Target</h2>
          {current.asOf && (
            <span className="text-xs text-muted-foreground">as of {current.asOf}</span>
          )}
        </div>

        <div className="space-y-0.5">
          <GapRow
            label="Weight (EMA)"
            current={current.emaWeight}
            target={isNaN(watched.targetWeight as number) ? null : (watched.targetWeight ?? null)}
            unit="kg"
            lowerIsBetter
          />
          <GapRow
            label="Body Fat %"
            current={current.trueFatPct}
            target={isNaN(watched.targetBodyFatPct as number) ? null : (watched.targetBodyFatPct ?? null)}
            unit="%"
            lowerIsBetter
          />
          <GapRow
            label="Protein (7d avg)"
            current={current.avgProtein7d}
            target={isNaN(watched.dailyProteinTarget as number) ? null : (watched.dailyProteinTarget ?? null)}
            unit="g"
          />
          <GapRow
            label="Steps (7d avg)"
            current={current.avgSteps7d}
            target={isNaN(watched.dailyStepsTarget as number) ? null : (watched.dailyStepsTarget ?? null)}
            unit="steps"
          />
          <GapRow
            label="Workouts (this week)"
            current={current.workoutsThisWeek}
            target={isNaN(watched.weeklyWorkoutTarget as number) ? null : (watched.weeklyWorkoutTarget ?? null)}
            unit="days"
          />
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t">
          Preview updates as you type. Save to apply changes to your confidence score.
        </p>
      </div>
    </div>
  )
}
