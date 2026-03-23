import { auth } from '@/lib/auth'
import { getDashboardData } from '@/lib/services/dashboard'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const session = await auth()
  const data = await getDashboardData(session!.user!.id!)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <DashboardClient data={data} />
    </div>
  )
}
