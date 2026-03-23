import { auth } from '@/lib/auth'
import { getGoal } from '@/lib/services/goal'
import { GoalsClient } from './goals-client'

export default async function GoalsPage() {
  const session = await auth()
  const goal = await getGoal(session!.user!.id!)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">Set your fitness targets to unlock confidence scoring and alerts.</p>
      </div>
      <GoalsClient goal={goal} />
    </div>
  )
}
