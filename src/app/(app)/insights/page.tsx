import { auth } from '@/lib/auth'
import { getInsights } from '@/lib/services/insights'
import { InsightsClient } from './insights-client'

export default async function InsightsPage() {
  const session = await auth()
  const data = await getInsights(session!.user!.id!)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Insights</h1>
      <InsightsClient data={data} />
    </div>
  )
}
