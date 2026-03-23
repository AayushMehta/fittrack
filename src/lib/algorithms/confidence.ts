/**
 * Confidence score — how accurately the week's data reflects true fat loss.
 * Each sub-score is 0–100. Overall = average of three.
 *
 * proteinScore  = (actualProtein / goalProtein) × 100, capped at 100
 * trainingScore = (workoutsThisWeek / weeklyWorkoutGoal) × 100, capped at 100
 * activityScore = (avgSteps7d / dailyStepGoal) × 100, capped at 100
 */
export function calcSubScore(actual: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, (actual / goal) * 100)
}

export function calcConfidence(
  proteinScore: number,
  trainingScore: number,
  activityScore: number,
): number {
  return (proteinScore + trainingScore + activityScore) / 3
}
