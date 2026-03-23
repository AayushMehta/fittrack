import { auth } from '@/lib/auth'
import { getLogByDate } from '@/lib/services/daily-log'
import { toISODate } from '@/lib/utils'
import { DailyLogClient } from './daily-log-client'

export default async function LogPage() {
  const session = await auth()
  const today = toISODate(new Date())
  const existing = await getLogByDate(session!.user!.id!, today)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily Log</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
      </div>
      <DailyLogClient today={today} existing={existing} />
    </div>
  )
}
