'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { goalSchema, type GoalInput } from '@/lib/validations/goal'
import type { UserGoal } from '@prisma/client'

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

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function GoalsClient({ goal }: { goal: UserGoal | null }) {
  const router = useRouter()
  const {
    register,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
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

      <Field label="Weekly Workout Target" id="weeklyWorkoutTarget" unit="days" error={errors.weeklyWorkoutTarget?.message}>
        <input
          id="weeklyWorkoutTarget"
          type="number"
          min="0"
          max="14"
          className={inputClass}
          placeholder="e.g. 3"
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
  )
}
