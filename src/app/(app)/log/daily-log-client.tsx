'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { dailyLogSchema, WORKOUT_TYPES, type DailyLogInput } from '@/lib/validations/daily-log'
import type { DailyLog } from '@prisma/client'

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function Field({
  label,
  id,
  unit,
  optional = true,
  error,
  children,
}: {
  label: string
  id: string
  unit?: string
  optional?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {unit && <span className="ml-1 text-xs text-muted-foreground">({unit})</span>}
        {optional && <span className="ml-1 text-xs text-muted-foreground">optional</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function DailyLogClient({ today, existing }: { today: string; existing: DailyLog | null }) {
  const router = useRouter()
  const isCorrection = !!existing

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DailyLogInput>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      date: today,
      weight: existing?.weight ?? undefined,
      steps: existing?.steps ?? undefined,
      workedOut: existing?.workedOut ?? false,
      workoutType: (existing?.workoutType as DailyLogInput['workoutType']) ?? undefined,
      caloriesIntake: existing?.caloriesIntake ?? undefined,
      proteinIntake: existing?.proteinIntake ?? undefined,
      carbIntake: existing?.carbIntake ?? undefined,
      sodiumIntake: existing?.sodiumIntake ?? undefined,
      bodyFatPct: existing?.bodyFatPct ?? undefined,
      skeletalMuscleMass: existing?.skeletalMuscleMass ?? undefined,
      bodyWaterPct: existing?.bodyWaterPct ?? undefined,
      sleepHours: existing?.sleepHours ?? undefined,
    },
  })

  const workedOut = watch('workedOut')

  async function onSubmit(data: DailyLogInput) {
    const url = isCorrection ? `/api/logs/${today}` : '/api/logs'
    const method = isCorrection ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      toast.success(isCorrection ? 'Correction logged!' : 'Entry saved!')
      router.refresh()
      router.push('/dashboard')
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Failed to save log')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
      {isCorrection && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          You already logged today. Submitting will create a correction entry (original is preserved).
        </div>
      )}

      <input type="hidden" {...register('date')} />

      {/* Required */}
      <Field label="Weight" id="weight" unit="kg" optional={false} error={errors.weight?.message}>
        <input
          id="weight"
          type="number"
          step="0.1"
          className={inputClass}
          placeholder="e.g. 78.4"
          {...register('weight', { valueAsNumber: true })}
        />
      </Field>

      {/* Activity */}
      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</p>

        <Field label="Steps" id="steps" unit="steps" error={errors.steps?.message}>
          <input
            id="steps"
            type="number"
            className={inputClass}
            placeholder="e.g. 9000"
            {...register('steps', { valueAsNumber: true })}
          />
        </Field>

        <div className="flex items-center gap-3">
          <input id="workedOut" type="checkbox" className="h-4 w-4" {...register('workedOut')} />
          <label htmlFor="workedOut" className="text-sm font-medium">Worked out today</label>
        </div>

        {workedOut && (
          <Field label="Workout Type" id="workoutType" error={errors.workoutType?.message}>
            <select id="workoutType" className={inputClass} {...register('workoutType')}>
              <option value="">Select type…</option>
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {/* Nutrition */}
      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nutrition</p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories" id="caloriesIntake" unit="kcal" error={errors.caloriesIntake?.message}>
            <input
              id="caloriesIntake"
              type="number"
              className={inputClass}
              placeholder="2000"
              {...register('caloriesIntake', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Protein" id="proteinIntake" unit="g" error={errors.proteinIntake?.message}>
            <input
              id="proteinIntake"
              type="number"
              step="0.1"
              className={inputClass}
              placeholder="160"
              {...register('proteinIntake', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Carbs" id="carbIntake" unit="g" error={errors.carbIntake?.message}>
            <input
              id="carbIntake"
              type="number"
              step="0.1"
              className={inputClass}
              placeholder="220"
              {...register('carbIntake', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Sodium" id="sodiumIntake" unit="mg" error={errors.sodiumIntake?.message}>
            <input
              id="sodiumIntake"
              type="number"
              className={inputClass}
              placeholder="2400"
              {...register('sodiumIntake', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </div>

      {/* BIA */}
      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">BIA Scale (optional)</p>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Body Fat" id="bodyFatPct" unit="%" error={errors.bodyFatPct?.message}>
            <input
              id="bodyFatPct"
              type="number"
              step="0.1"
              className={inputClass}
              placeholder="18.2"
              {...register('bodyFatPct', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Muscle Mass" id="skeletalMuscleMass" unit="kg" error={errors.skeletalMuscleMass?.message}>
            <input
              id="skeletalMuscleMass"
              type="number"
              step="0.1"
              className={inputClass}
              placeholder="34.1"
              {...register('skeletalMuscleMass', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Body Water" id="bodyWaterPct" unit="%" error={errors.bodyWaterPct?.message}>
            <input
              id="bodyWaterPct"
              type="number"
              step="0.1"
              className={inputClass}
              placeholder="59.5"
              {...register('bodyWaterPct', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </div>

      {/* Lifestyle */}
      <div className="border-t pt-4">
        <Field label="Sleep" id="sleepHours" unit="hours" error={errors.sleepHours?.message}>
          <input
            id="sleepHours"
            type="number"
            step="0.5"
            className={inputClass}
            placeholder="7.5"
            {...register('sleepHours', { valueAsNumber: true })}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving…' : isCorrection ? 'Save Correction' : 'Save Entry'}
      </button>
    </form>
  )
}
