import type { AIContext } from './context'

export type AnalysisMode = 'weekly' | 'root-cause' | 'recommendations' | 'narrative'

const SYSTEM_PROMPT = `You are a sports nutritionist and body composition analyst. Your job is to interpret fitness tracking data and deliver concise, direct, data-driven analysis.

Rules:
- Be specific: use the actual numbers from the data
- Be direct: lead with the insight, not the preamble
- Be brief: aim for 80–150 words max
- Use plain language: no jargon unless the user would know it
- Never invent data not present in the context
- If data is insufficient, say so briefly`

function formatContext(ctx: AIContext): string {
  const lines: string[] = []

  lines.push(`=== TRACKING PERIOD: ${ctx.dateRange.from} to ${ctx.dateRange.to} ===`)

  if (ctx.latest) {
    lines.push(`\nLATEST SNAPSHOT (${ctx.latest.date}):`)
    lines.push(`  Weight: ${ctx.latest.weight} kg | EMA: ${ctx.latest.ema?.toFixed(1) ?? 'N/A'} kg`)
    lines.push(`  True Fat%: ${ctx.latest.trueFatPct?.toFixed(1) ?? 'N/A'}% | Lean Mass: ${ctx.latest.leanMass?.toFixed(1) ?? 'N/A'} kg`)
    lines.push(`  Confidence Score: ${ctx.latest.confidenceScore?.toFixed(0) ?? 'N/A'}/100`)
  }

  if (ctx.trend.emaDelta != null) {
    const dir = ctx.trend.emaDelta < 0 ? 'loss' : ctx.trend.emaDelta > 0 ? 'gain' : 'stable'
    lines.push(`\n30-DAY EMA TREND: ${ctx.trend.emaStart?.toFixed(1)} → ${ctx.trend.emaEnd?.toFixed(1)} kg (${Math.abs(ctx.trend.emaDelta).toFixed(2)} kg ${dir})`)
  }

  lines.push(`\nAVERAGE SCORES (30d): Confidence ${ctx.trend.avgConfidence ?? 'N/A'} | Protein ${ctx.trend.avgProteinScore ?? 'N/A'} | Training ${ctx.trend.avgTrainingScore ?? 'N/A'} | Steps ${ctx.trend.avgActivityScore ?? 'N/A'}`)

  lines.push(`\n7-DAY ADHERENCE (${ctx.adherence7d.loggedDays} days logged):`)
  lines.push(`  Protein: hit target ${ctx.adherence7d.proteinHitDays}/${ctx.adherence7d.loggedDays} days | avg ${ctx.adherence7d.avgProtein ?? 'N/A'} g`)
  lines.push(`  Workouts: ${ctx.adherence7d.workoutDays}/${ctx.adherence7d.loggedDays} days`)
  lines.push(`  Steps: hit target ${ctx.adherence7d.stepsHitDays}/${ctx.adherence7d.loggedDays} days | avg ${ctx.adherence7d.avgSteps ?? 'N/A'}`)

  if (ctx.goals) {
    lines.push(`\nGOALS: Weight → ${ctx.goals.targetWeight ?? 'not set'} kg | Fat% → ${ctx.goals.targetBodyFatPct ?? 'not set'}%`)
    lines.push(`  Protein ${ctx.goals.dailyProteinTarget ?? 'not set'} g/day | Calories ${ctx.goals.dailyCalorieTarget ?? 'not set'} kcal/day`)
    lines.push(`  Steps ${ctx.goals.dailyStepsTarget ?? 'not set'}/day | Workouts ${ctx.goals.weeklyWorkoutTarget ?? 'not set'}/week`)
  }

  if (ctx.activeAlerts.length > 0) {
    lines.push(`\nACTIVE ALERTS: ${ctx.activeAlerts.map((a) => `${a.type} (${a.severity})`).join(', ')}`)
  }

  return lines.join('\n')
}

export function buildPrompt(mode: AnalysisMode, ctx: AIContext): { system: string; user: string } {
  const contextStr = formatContext(ctx)

  const userPrompts: Record<AnalysisMode, string> = {
    weekly: `Here is my fitness tracking data:\n\n${contextStr}\n\nGive me a concise weekly performance summary. Cover: EMA weight trend, confidence score interpretation, and how well I hit my key targets this week. Keep it under 120 words.`,

    'root-cause': `Here is my fitness tracking data:\n\n${contextStr}\n\nAnalyze the weight trend and identify likely root causes. Distinguish between actual fat/lean mass changes vs water retention, glycogen, or sodium effects. If there are any unusual spikes or drops, explain what likely caused them. Keep it under 150 words.`,

    recommendations: `Here is my fitness tracking data:\n\n${contextStr}\n\nBased on my current trends and goal gaps, give me 2–3 specific, actionable recommendations. Be direct and quantify the changes (e.g. "increase protein by 30g", "reduce calories by 100 kcal"). Prioritize the highest-leverage interventions. Keep it under 130 words.`,

    narrative: `Here is my fitness tracking data:\n\n${contextStr}\n\nWrite a 30-day progress narrative. Cover: what changed, what worked, what didn't, and whether I'm on track toward my goals. Be honest and data-driven. Keep it under 200 words.`,
  }

  return {
    system: SYSTEM_PROMPT,
    user: userPrompts[mode],
  }
}
