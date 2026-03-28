/**
 * FitTrack demo seed
 * Run: pnpm db:seed
 *
 * Creates one demo user with 21 days of realistic weight tracking data.
 * Idempotent — safe to re-run.
 *
 * Login: demo@fittrack.app / demo1234
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// --- helpers ---

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

// Simple EMA for seeding computed metrics
function ema(weight: number, prev: number | null, alpha = 0.3): number {
  if (prev === null) return weight
  return alpha * weight + (1 - alpha) * prev
}

function rollingAvg(weights: number[]): number | null {
  if (weights.length < 7) return null
  const last7 = weights.slice(-7)
  return last7.reduce((a, b) => a + b, 0) / 7
}

async function main() {
  console.log('Seeding demo user…')

  // --- User ---
  const user = await db.user.upsert({
    where: { email: 'demo@fittrack.app' },
    update: {},
    create: {
      email: 'demo@fittrack.app',
      name: 'Demo User',
      password: await bcrypt.hash('demo1234', 12),
      timezone: 'Asia/Kolkata',
    },
  })
  console.log(`User: ${user.email} (${user.id})`)

  // --- Goals ---
  await db.userGoal.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      targetWeight: 72,
      targetBodyFatPct: 15,
      dailyCalorieTarget: 2000,
      dailyProteinTarget: 160,
      dailyStepsTarget: 8000,
      weeklyWorkoutTarget: 4,
    },
  })
  console.log('Goals upserted.')

  // --- Daily logs (21 days, gradual weight loss) ---
  // Starting at ~79 kg, losing ~0.3 kg/week on average
  const startWeight = 79.2
  const dailyWeights: number[] = []
  const logs = []

  for (let i = 20; i >= 0; i--) {
    const trend = startWeight - ((20 - i) * 0.043) // ~0.3 kg/week
    // add realistic noise
    const noise = (Math.sin(i * 2.1) * 0.4) + (Math.cos(i * 1.3) * 0.3)
    const weight = Math.round((trend + noise) * 10) / 10

    dailyWeights.push(weight)

    const workedOut = i % 2 !== 0 && i % 7 !== 0 // ~4 workouts/week
    const protein = workedOut ? 155 + Math.floor(Math.random() * 20) : 130 + Math.floor(Math.random() * 25)
    const steps = 7000 + Math.floor(Math.sin(i) * 2000) + Math.floor(Math.random() * 1000)

    logs.push({
      userId: user.id,
      date: daysAgo(i),
      weight,
      steps,
      workedOut,
      workoutType: workedOut ? 'STRENGTH' : null,
      caloriesIntake: 1900 + Math.floor(Math.random() * 200),
      proteinIntake: protein,
      bodyFatPct: i < 14 ? 19.5 - (14 - i) * 0.05 : null,
      bodyWaterPct: i < 14 ? 59.5 + (Math.random() * 2) : null,
    })
  }

  // Upsert logs (unique on userId+date)
  for (const log of logs) {
    await db.dailyLog.upsert({
      where: { userId_date: { userId: log.userId, date: log.date } },
      update: {},
      create: log,
    })
  }
  console.log(`${logs.length} daily logs upserted.`)

  // --- Computed metrics ---
  let prevEma: number | null = null
  const weightsSoFar: number[] = []

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i]
    weightsSoFar.push(log.weight)

    const emaWeight = ema(log.weight, prevEma)
    prevEma = emaWeight
    const rollingAvg7d = rollingAvg(weightsSoFar)

    // Body composition
    const trueFatPct = log.bodyFatPct != null && log.bodyWaterPct != null
      ? Math.max(0, log.bodyFatPct - (log.bodyWaterPct - 60) * 0.5)
      : null
    const estimatedFatMass = trueFatPct != null ? log.weight * (trueFatPct / 100) : null
    const estimatedLeanMass = trueFatPct != null ? log.weight - (estimatedFatMass ?? 0) : null

    // Confidence
    const proteinScore = Math.min(100, ((log.proteinIntake ?? 0) / 160) * 100)
    const workedOutCount = logs.slice(Math.max(0, i - 6), i + 1).filter(l => l.workedOut).length
    const trainingScore = Math.min(100, (workedOutCount / 4) * 100)
    const stepValues = logs.slice(Math.max(0, i - 6), i + 1).map(l => l.steps ?? 0)
    const avgSteps = stepValues.reduce((a, b) => a + b, 0) / stepValues.length
    const activityScore = Math.min(100, (avgSteps / 8000) * 100)
    const confidenceScore = (proteinScore + trainingScore + activityScore) / 3

    await db.computedMetric.upsert({
      where: { userId_date: { userId: user.id, date: log.date } },
      update: {},
      create: {
        userId: user.id,
        date: log.date,
        emaWeight: Math.round(emaWeight * 100) / 100,
        rollingAvg7d: rollingAvg7d ? Math.round(rollingAvg7d * 100) / 100 : null,
        trueFatPct: trueFatPct ? Math.round(trueFatPct * 10) / 10 : null,
        estimatedFatMass: estimatedFatMass ? Math.round(estimatedFatMass * 10) / 10 : null,
        estimatedLeanMass: estimatedLeanMass ? Math.round(estimatedLeanMass * 10) / 10 : null,
        confidenceScore: Math.round(confidenceScore),
        proteinScore: Math.round(proteinScore),
        trainingScore: Math.round(trainingScore),
        activityScore: Math.round(activityScore),
        alerts: '[]',
      },
    })
  }
  console.log('Computed metrics upserted.')
  console.log('\nDone! Login: demo@fittrack.app / demo1234')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
