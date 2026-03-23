import { auth } from '@/lib/auth'
import { getWeightTrend, getBodyComposition } from '@/lib/services/progress'
import { ProgressClient } from './progress-client'

export default async function ProgressPage() {
  const session = await auth()
  const [weightTrend, bodyComp] = await Promise.all([
    getWeightTrend(session!.user!.id!, 30),
    getBodyComposition(session!.user!.id!, 30),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Progress</h1>
      <ProgressClient weightTrend={weightTrend} bodyComp={bodyComp} />
    </div>
  )
}
