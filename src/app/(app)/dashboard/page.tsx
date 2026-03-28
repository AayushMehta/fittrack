import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/lib/services/dashboard'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const initialData = await getDashboardData(session.user.id)

  return (
    <div className="space-y-6">
      <DashboardClient initialData={initialData} />
    </div>
  )
}
