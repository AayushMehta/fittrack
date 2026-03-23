export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface Alert {
  type: string
  message: string
  severity: AlertSeverity
}

interface AlertInput {
  emaToday: number
  ema14dAgo: number | null
  confidenceScore: number | null
  proteinIntake: number | null
  dailyProteinGoal: number | null
  trueFatPct: number | null
  leanMassKg: number | null
  prevLeanMassKg: number | null
}

/**
 * Generate decision alerts based on today's metrics.
 * Returns an array of 0–5 alerts.
 */
export function generateAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = []

  // 1. Plateau detection — EMA moved less than 0.1 kg over 14 days
  if (input.ema14dAgo !== null) {
    const emaDelta = Math.abs(input.emaToday - input.ema14dAgo)
    if (emaDelta < 0.1) {
      alerts.push({
        type: 'PLATEAU',
        message: `Weight has barely moved in 14 days (Δ${emaDelta.toFixed(2)} kg). Consider adjusting calories or training.`,
        severity: 'warning',
      })
    }

    // 2. Fat loss too slow (> 14 days of data, losing < 0.1 kg/week on average)
    const weeklyLoss = (input.ema14dAgo - input.emaToday) / 2 // kg/week over 2 weeks
    if (weeklyLoss < 0.1 && weeklyLoss >= 0) {
      alerts.push({
        type: 'FAT_LOSS_TOO_SLOW',
        message: `Fat loss pace is slow (~${weeklyLoss.toFixed(2)} kg/week). Review caloric deficit.`,
        severity: 'info',
      })
    }

    // 3. Fat loss too fast (> 0.75 kg/week — risks muscle loss)
    if (weeklyLoss > 0.75) {
      alerts.push({
        type: 'FAT_LOSS_TOO_FAST',
        message: `Losing weight too fast (~${weeklyLoss.toFixed(2)} kg/week). Increase calories to protect muscle.`,
        severity: 'warning',
      })
    }
  }

  // 4. Muscle loss risk — lean mass dropped by > 0.5 kg vs last week
  if (input.leanMassKg !== null && input.prevLeanMassKg !== null) {
    const leanDelta = input.leanMassKg - input.prevLeanMassKg
    if (leanDelta < -0.5) {
      alerts.push({
        type: 'MUSCLE_LOSS_RISK',
        message: `Lean mass dropped by ${Math.abs(leanDelta).toFixed(1)} kg. Increase protein and review training.`,
        severity: 'critical',
      })
    }
  }

  // 5. Low protein — below 80% of goal
  if (input.proteinIntake !== null && input.dailyProteinGoal !== null && input.dailyProteinGoal > 0) {
    const proteinPct = (input.proteinIntake / input.dailyProteinGoal) * 100
    if (proteinPct < 80) {
      alerts.push({
        type: 'LOW_PROTEIN',
        message: `Protein intake is only ${Math.round(proteinPct)}% of goal (${input.proteinIntake}g / ${input.dailyProteinGoal}g).`,
        severity: 'warning',
      })
    }
  }

  return alerts
}
